# -*- coding: utf-8 -*-
"""
批量检查所有原型页面在浏览器里的实际渲染状态
用 Playwright（通过 webapp-testing 环境）或直接 HTTP + 结构断言

这里做「结构级」检查：抓 HTML，验证
  - 有 page-scope 容器
  - 有自定义导航栏或标题栏
  - 正文文字量不为空
  - 无 {{ }} 残留
  - 图片资源全部存在
"""
import os
import re
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


def text_of(html):
    s = re.sub(r"<script.*?</script>", "", html, flags=re.S)
    s = re.sub(r"<style.*?</style>", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", "", s)


def main():
    header = "%-22s %6s %6s %5s %5s %5s %s" % (
        "PAGE", "文字", "图片", "破图", "绑定", "结构", "状态")
    print(header)
    print("-" * len(header))
    bad = []

    for p in PAGES:
        try:
            html = fetch(BASE + p + ".html")
        except Exception as e:
            print("%-22s 访问失败 %s" % (p, e))
            bad.append(p)
            continue

        txt = len(text_of(html))
        imgs = re.findall(r'<img[^>]*src="([^"]+)"', html)
        broken = 0
        for src in imgs:
            if src.startswith("http"):
                continue
            if not os.path.exists(os.path.join("prototype", src.lstrip("/"))):
                broken += 1
        resid = html.count("{{")
        has_scope = 'class="page-scope' in html
        has_device = 'class="device"' in html
        struct_ok = has_scope and has_device

        status = "OK"
        if broken:
            status = "破图"
            bad.append(p)
        elif resid:
            status = "残留绑定"
            bad.append(p)
        elif txt < 40 and not p.endswith("-form") and p != "complaint-edit":
            status = "文字过少"
            bad.append(p)
        elif not struct_ok:
            status = "结构缺失"
            bad.append(p)

        print("%-22s %6d %6d %5d %5d %5s %s" % (
            p, txt, len(imgs), broken, resid,
            "✓" if struct_ok else "✗", status))

    print()
    if bad:
        print("⚠️ 需关注:", ", ".join(sorted(set(bad))))
    else:
        print("✅ 全部通过")


if __name__ == "__main__":
    main()
