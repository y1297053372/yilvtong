#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
衣律通 · 云环境迁移：把本地数据导入新 CloudBase 环境

前提：已用 `tcb login` 登录，且已创建并记录新环境 ID。

流程：
  1. 改写数据库 JSONL 里的云存储引用（旧 envId.bucket → 新环境）
  2. 用 `tcb db nosql execute` 逐集合批量 INSERT
  3. 校验每个集合的条数

用法：
  # 0) 先看要做什么，不实际写入
  python tools/migrate_to_new_env.py \
      --new-env cloud1-NEWENVID \
      --new-bucket 636c-cloud1-NEWENVID-1234567890 \
      --dry-run

  # 1) 确认后执行
  python tools/migrate_to_new_env.py \
      --new-env cloud1-NEWENVID \
      --new-bucket 636c-cloud1-NEWENVID-1234567890

说明：
  - 源文件是 *-<collection>.json 形式的 JSONL（每行一个文档）
  - 只取 database_export-* 系列，避免 article_new/document_article_new 重复导入
  - 默认每批 100 条，可用 --batch 调整
"""

import argparse
import datetime
import glob
import json
import os
import re
import subprocess
import sys
import time

OLD_ENV = "cloud1-4gt9emvjfe812487"
EXPORT_PREFIX = "database_export-" + OLD_ENV + "-"
COLLECTIONS = ["article", "document_article", "comments", "documents", "user"]


def tcb(*args, dry=False):
    """调用 cloudbase CLI"""
    cmd = ["npx", "-y", "-p", "@cloudbase/cli@latest", "tcb"] + list(args)
    if dry:
        print("    [dry-run] " + " ".join(cmd))
        return None
    env = dict(os.environ)
    env["npm_config_yes"] = "true"
    r = subprocess.run(cmd, capture_output=True, text=True, env=env, shell=False)
    return r


def load_jsonl(path):
    docs = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                docs.append(json.loads(line))
    return docs


def normalize_dates(obj):
    """
    把 MongoDB Extended JSON 的 {"$date": "..."} / {"$date": {"$numberLong": "..."}}
    转成 ISO 字符串，避免被当成普通嵌套对象写库。
    """
    if isinstance(obj, dict):
        if len(obj) == 1 and "$date" in obj:
            v = obj["$date"]
            if isinstance(v, dict) and "$numberLong" in v:
                try:
                    ms = int(v["$numberLong"])
                    return datetime.datetime.utcfromtimestamp(ms / 1000).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
                except Exception:
                    return v
            return v
        return {k: normalize_dates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize_dates(v) for v in obj]
    return obj


def rewrite_refs(obj, old_env, new_env, new_bucket):
    """递归改写 cloud://<old_env>.<bucket>/ → cloud://<new_env>.<new_bucket>/"""
    if isinstance(obj, dict):
        return {k: rewrite_refs(v, old_env, new_env, new_bucket) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rewrite_refs(v, old_env, new_env, new_bucket) for v in obj]
    if isinstance(obj, str) and ("cloud://%s." % old_env) in obj:
        pattern = re.compile(
            r"cloud://" + re.escape(old_env) + r"\.[^/\s\"'\\]+"
        )
        return pattern.sub("cloud://%s.%s" % (new_env, new_bucket), obj)
    return obj


def main():
    ap = argparse.ArgumentParser(description="把数据库导出导入新的 CloudBase 环境")
    ap.add_argument("--new-env", required=True, help="新环境 ID")
    ap.add_argument("--new-bucket", required=True, help="新环境存储 bucket 前缀")
    ap.add_argument("--old-env", default=OLD_ENV, help="旧环境 ID（默认 %s）" % OLD_ENV)
    ap.add_argument("--batch", type=int, default=100, help="每批写入条数（默认 100）")
    ap.add_argument("--dry-run", action="store_true", help="只检查不写入")
    ap.add_argument("--skip-rewrite", action="store_true", help="跳过文件改写（已在别处改过）")
    args = ap.parse_args()

    print("=" * 72)
    print("新环境  :", args.new_env)
    print("新 bucket:", args.new_bucket)
    print("旧环境  :", args.old_env)
    print("=" * 72)

    plan = {}
    for coll in COLLECTIONS:
        p = "数据库/%s%s.json" % (EXPORT_PREFIX, coll)
        if not os.path.exists(p):
            print("⚠️  跳过（文件不存在）:", p)
            continue
        docs = load_jsonl(p)
        plan[coll] = (p, docs)
        print("%-20s %3d 条  %s" % (coll, len(docs), p))

    if not plan:
        print("没有可导入的数据。", file=sys.stderr)
        return 1

    total = sum(len(d) for _, d in plan.values())
    print("-" * 72)
    print("合计 %d 条记录，%d 个集合" % (total, len(plan)))

    if args.dry_run:
        print("\n[dry-run] 不写入数据库。")
        for coll, (p, docs) in plan.items():
            sample = json.dumps(docs[0], ensure_ascii=False)[:120]
            print("  %s 样例: %s..." % (coll, sample))
        return 0

    # 1) 改写引用 + 规范化日期
    if not args.skip_rewrite:
        print("\n[1/2] 改写云存储引用与日期格式 ...")
        for coll, (p, docs) in plan.items():
            new_docs = []
            for d in docs:
                d = rewrite_refs(d, args.old_env, args.new_env, args.new_bucket)
                d = normalize_dates(d)
                new_docs.append(d)
            with open(p, "w", encoding="utf-8", newline="\n") as fh:
                for d in new_docs:
                    fh.write(json.dumps(d, ensure_ascii=False) + "\n")
            plan[coll] = (p, new_docs)
            print("  ✓ %s 已改写" % coll)

    # 2) 逐集合插入
    print("\n[2/2] 写入数据库 ...")
    for coll, (p, docs) in plan.items():
        print("\n  → %s (%d 条)" % (coll, len(docs)))
        ok = 0
        for i in range(0, len(docs), args.batch):
            chunk = docs[i:i + args.batch]
            payload = [{
                "TableName": coll,
                "CommandType": "INSERT",
                "Command": json.dumps({"insert": coll, "documents": chunk}, ensure_ascii=False),
            }]
            r = tcb("db", "nosql", "execute",
                    "--command", json.dumps(payload, ensure_ascii=False),
                    "-e", args.new_env, "--json")
            if r is None or r.returncode != 0:
                err = (r.stderr or r.stdout or "")[:300] if r else "dry"
                print("    ✗ 第 %d 批失败: %s" % (i // args.batch + 1, err))
                break
            ok += len(chunk)
            print("    批 %d: +%d (累计 %d/%d)"
                  % (i // args.batch + 1, len(chunk), ok, len(docs)))
            time.sleep(0.3)
        print("  %s: %d/%d" % (coll, ok, len(docs)))

    print("\n完成。请到控制台核对各集合条数。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
