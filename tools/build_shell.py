# -*- coding: utf-8 -*-
"""
生成离线原型的 HTML 外壳

读取 prototype/pages/<name>.html 片段，套上手机外壳 + TabBar，
输出可独立打开的 prototype/<name>.html。
"""
import io
import json
import os
import re

PAGES_META = [
    ("index",              "首页",        "tab",   0),
    ("knowledge",          "知识库",      "back",  -1),
    ("article",            "文章详情",    "back",  -1),
    ("document",           "文书生成",    "tab",   1),
    ("complaint-form",     "民事起诉状",  "back",  -1),
    ("complaint-detail",   "起诉状预览",  "back",  -1),
    ("report-form",        "举报文书",    "back",  -1),
    ("report-detail",      "举报信预览",  "back",  -1),
    ("negotiation-form",   "协商函",      "back",  -1),
    ("negotiation-detail", "协商函预览",  "back",  -1),
    ("agency",             "维权代理",    "back",  -1),
    ("profile",            "我的",        "tab",   2),
    ("my-documents",       "我的文书",    "back",  -1),
    ("search",             "搜索",        "back",  -1),
    ("list",               "我的收藏",    "back",  -1),
    ("document-article",   "文书解读",    "back",  -1),
    ("complaint-edit",     "编辑文书",    "back",  -1),
]

TAB_ITEMS = [
    ("index", "首页", 0),
    ("document", "文书生成", 1),
    ("profile", "我的", 2),
]


def scope(page):
    return "scope-" + page.replace("-", "_")


SHELL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · 衣律通原型</title>
<link rel="stylesheet" href="css/app.css">
<script src="_fix.js" defer></script>
<style>
  /* 本页专用的最小修正 */
  .page-scope {{ min-height: 100%; }}
</style>
</head>
<body class="page-root">
<div class="phone">
  <div class="phone-notch">
    <span class="time">9:41</span>
    <span class="icons"><span></span><span></span><span></span></span>
  </div>
  <div class="phone-header">
    {back}<span>{title}</span>
  </div>
  <div class="phone-body">
    <div class="page-scope {scope}">
{content}
    </div>
  </div>
  {tabbar}
</div>

{notes}
</body>
</html>
"""

TABBAR = """<nav class="tabbar">
{items}
</nav>"""

TAB_ITEM = """  <a href="{href}" class="{cls}">
    <span class="tab-ico" style="background-image:url('{icon}')"></span>
    <span>{label}</span>
  </a>"""


def build_tabbar(active_tab):
    items = []
    icons = ["assets/ic-evidence.svg", "assets/ic-law.svg", "assets/ic-channel.svg"]
    for i, (page, label, idx) in enumerate(TAB_ITEMS):
        cls = "active" if idx == active_tab else ""
        items.append(TAB_ITEM.format(
            href=page + ".html", cls=cls, icon=icons[i], label=label))
    return TABBAR.format(items="\n".join(items))


def main():
    total = 0
    for page, title, nav, tab in PAGES_META:
        frag_path = "prototype/pages/%s.html" % page
        if not os.path.exists(frag_path):
            print("跳过:", page)
            continue
        content = io.open(frag_path, encoding="utf-8").read()

        back = ""
        if nav == "back":
            back = '<a class="back" href="index.html" title="返回">‹</a>'

        tabbar = build_tabbar(tab) if tab >= 0 else ""

        html = SHELL.format(
            title=title,
            scope=scope(page),
            back=back,
            content=content,
            tabbar=tabbar,
            notes="",
        )

        out = "prototype/%s.html" % page
        with io.open(out, "w", encoding="utf-8") as fh:
            fh.write(html)
        total += 1
        print("✅ %-22s %s (%d KB)" % (page, out, len(html) // 1024))
    print("\n共生成 %d 个页面" % total)


if __name__ == "__main__":
    main()
