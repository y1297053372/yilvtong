#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
云环境迁移：把数据库导出文件里的云存储引用从旧环境改写到新环境。

背景：
  数据库 JSONL 里的文章图片字段形如
      cloud://<envId>.<bucketPrefix>/<path>
  换云环境后 envId 与 bucketPrefix 都会变，不改写则图片全部 404。

用法：
  # 先看会改什么（不写盘）
  python tools/rewrite_cloud_env.py \
      --old-env cloud1-4gt9emvjfe812487 \
      --new-env cloud1-NEWENVID \
      --new-bucket 636c-cloud1-NEWENVID-1234567890 \
      --dry-run

  # 确认后改写
  python tools/rewrite_cloud_env.py \
      --old-env cloud1-4gt9emvjfe812487 \
      --new-env cloud1-NEWENVID \
      --new-bucket 636c-cloud1-NEWENVID-1234567890

bucketPrefix 从哪拿：
  云开发控制台 → 存储 → 随便点开一个文件 → 看它的 FileID，
  形如 cloud://<envId>.<bucketPrefix>/<path>，取中间那一截。
"""

import argparse
import glob
import os
import re
import sys


def find_files(pattern):
    files = []
    for p in pattern:
        files.extend(glob.glob(p))
    return sorted(set(files))


def main():
    ap = argparse.ArgumentParser(description="改写数据库导出中的云存储环境引用")
    ap.add_argument("--old-env", required=True, help="旧环境 ID，如 cloud1-4gt9emvjfe812487")
    ap.add_argument("--new-env", required=True, help="新环境 ID")
    ap.add_argument("--new-bucket", required=True, help="新环境存储 bucket 前缀，如 636c-cloud1-xxx-1234567890")
    ap.add_argument("--paths", nargs="+", default=["数据库/*.json"],
                    help="要处理的文件 glob（默认 数据库/*.json）")
    ap.add_argument("--dry-run", action="store_true", help="只统计不写盘")
    args = ap.parse_args()

    files = find_files(args.paths)
    if not files:
        print("未找到匹配文件：%s" % args.paths, file=sys.stderr)
        return 1

    # 匹配 cloud://<old-env>.<bucket>/<path>，整段换成新环境
    # bucket 部分允许任意非斜杠字符，避免依赖旧 bucket 具体值
    pat = re.compile(
        r"cloud://" + re.escape(args.old_env) + r"\.[^/\s\"'\)]+(?=/)"
    )

    total_files = 0
    total_hits = 0
    for f in files:
        with open(f, encoding="utf-8") as fh:
            text = fh.read()

        hits = pat.findall(text)
        if not hits:
            continue

        new_text = pat.sub("cloud://%s.%s" % (args.new_env, args.new_bucket), text)

        total_files += 1
        total_hits += len(hits)
        print("%-58s %4d 处" % (os.path.basename(f), len(hits)))

        if not args.dry_run:
            with open(f, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(new_text)

    print("-" * 70)
    if total_hits == 0:
        print("没有找到指向 %s 的引用。" % args.old_env)
        return 0

    print("合计 %d 个文件、%d 处引用 → cloud://%s.%s"
          % (total_files, total_hits, args.new_env, args.new_bucket))
    print("（dry-run，未写入）" if args.dry_run else "已写入。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
