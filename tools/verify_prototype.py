# -*- coding: utf-8 -*-
"""
批量验证原型页面：检查空白页、破图、残留绑定
用 requests 抓 HTML，检测关键结构
"""
import io
import json
import os
import re
import sys
import urllib.request

BASE = "http://127.0.0.1:8899/"

PAGES = [
    "index", "knowledge", "article", "document",
    "complaint-form", "complaint-detail",
    "report-form", "report-detail",
    "negotiation-form", "negotiation-detail",
    "agency", "profile", "my-documents",
    "search", "list", "document-article", "complaint-edit",
]


def fetch(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return r.read().decode("utf-8")


def main():
    print("%-22s %7s %6s %6s %6s  %s" % ("PAGE", "BYTES", "TEXT", "IMG", "ERR", "STATUS"))
    print("-" * 74)
    problems = []
    for p in PAGES:
        url = BASE + p + ".html"
        try:
            html = fetch(url)
        except Exception as e:
            print("%-22s  FETCH FAIL: %s" % (p, e))
            problems.append((p, "无法访问"))
            continue

        # 正文文字量（粗略）
        text = re.sub(r"<script.*?</script>", "", html, flags=re.S)
        text = re.sub(r"<style.*?</style>", "", text, flags=re.S)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", "", text)
        ntext = len(text)

        imgs = re.findall(r'<img[^>]*src="([^"]+)"', html)
        nimg = len(imgs)

        # 残留绑定
        residual = html.count("{{")

        # 检查图片是否存在
        bad = 0
        for src in imgs:
            if src.startswith("http"):
                continue
            path = os.path.join("prototype", src.lstrip("/"))
            if not os.path.exists(path):
                bad += 1

        status = "OK"
        if ntext < 60:
            status = "⚠️ 内容过少"
            problems.append((p, "内容过少(%d字)" % ntext))
        if residual:
            status = "⚠️ 残留绑定"
            problems.append((p, "残留 {{"))
        if bad:
            status = "⚠️ 破图 %d" % bad
            problems.append((p, "破图 %d" % bad))

        print("%-22s %7d %6d %6d %6d  %s" % (p, len(html), ntext, nimg, bad, status))

    print()
    if problems:
        print("需要处理：")
        for p, why in problems:
            print("  - %-20s %s" % (p, why))
    else:
        print("✅ 全部页面通过")


if __name__ == "__main__":
    main()
