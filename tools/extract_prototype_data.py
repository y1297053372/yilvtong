# -*- coding: utf-8 -*-
"""
从数据库导出中提取离线原型需要的静态数据，输出 JSON。
产出：prototype/data/bundle.json
"""
import json
import os
import re
import html

OUT_DIR = "prototype/data"
OLD_ENV = "cloud1-4gt9emvjfe812487"


def load_jsonl(path):
    docs = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                docs.append(json.loads(line))
    return docs


def norm_cat(v):
    """category_l1/l2 在导出里是 ['1'] 这种列表，取第一个元素"""
    if isinstance(v, list):
        return str(v[0]) if v else ""
    if v is None:
        return ""
    return str(v)


def fmt_date(d):
    """尝试把各种日期格式统一成 YYYY-MM-DD"""
    if d is None:
        return ""
    if isinstance(d, str):
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", d)
        if m:
            return "%s.%s.%s" % (m.group(1), m.group(2), m.group(3))
        return d[:10]
    if isinstance(d, (int, float)):
        import datetime
        try:
            ts = d / 1000 if d > 1e11 else d
            return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y.%m.%d")
        except Exception:
            return ""
    return ""


def clean_html(s):
    """把文章 HTML 里的云存储图片地址换成占位，去掉 wx 专属标签"""
    if not isinstance(s, str):
        return ""
    s = re.sub(r"cloud://[^\"'\s<>]+", "", s)
    s = re.sub(r"<img[^>]*>", "", s)
    return s


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    base = "数据库/database_export-%s-" % OLD_ENV

    articles = load_jsonl(base + "article.json")
    comments = load_jsonl(base + "comments.json")
    documents = load_jsonl(base + "documents.json")

    # 文章精简：只保留原型需要的字段
    # 找出已复制到 assets/articles 的封面图
    cover_dir = "prototype/assets/articles"
    covers = {}
    if os.path.isdir(cover_dir):
        for fn in os.listdir(cover_dir):
            stem, ext = os.path.splitext(fn)
            covers[stem] = "assets/articles/" + fn

    art_out = []
    for a in articles:
        content = a.get("content") or a.get("desc") or ""
        content = clean_html(content)
        art_out.append({
            "id": a.get("_id"),
            "title": a.get("title") or "无标题",
            "desc": (a.get("desc") or "")[:120],
            "category_l1": norm_cat(a.get("category_l1")),
            "category_l2": norm_cat(a.get("category_l2")),
            "date": fmt_date(a.get("date") or a.get("createdAt")),
            "view": a.get("view") or 0,
            "collect": a.get("collect") or 0,
            "tags": a.get("tags") or [],
            "image": covers.get(str(a.get("_id")), ""),
            "content": content[:20000],
        })

    # 分类统计
    from collections import Counter
    l1 = Counter(a["category_l1"] for a in art_out)

    bundle = {
        "meta": {
            "generated_from": base,
            "article_count": len(art_out),
            "comment_count": len(comments),
            "document_count": len(documents),
        },
        "articles": art_out,
        "comments": [{
            "id": c.get("_id"),
            "article_id": c.get("article_id"),
            "content": c.get("content"),
            "user": (c.get("user_info") or {}).get("nickName", "匿名"),
            "like": c.get("like_count") or 0,
            "time": fmt_date(c.get("create_time")),
        } for c in comments],
        "documents": [{
            "id": d.get("_id"),
            "type": d.get("type"),
            "title": d.get("title"),
            "status": d.get("status"),
            "time": fmt_date(d.get("updatedAt") or d.get("createdAt")),
        } for d in documents],
        "category_counts": dict(l1),
    }

    path = os.path.join(OUT_DIR, "bundle.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(bundle, fh, ensure_ascii=False, indent=1)

    size = os.path.getsize(path)
    print("✅ %s" % path)
    print("   文章 %d / 评论 %d / 文书 %d  （%.1f KB）"
          % (len(art_out), len(comments), len(documents), size / 1024))
    print("   一级分类分布:", dict(l1))
    # 抽一条检查
    a0 = art_out[0]
    print("   样例: [%s] %s | %s | %s"
          % (a0["date"], a0["title"][:30], a0["category_l1"], a0["desc"][:40]))


if __name__ == "__main__":
    main()
