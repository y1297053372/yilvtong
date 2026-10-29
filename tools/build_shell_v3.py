# -*- coding: utf-8 -*-
"""
外壳 v3：把 custom-header 从页面内容里提到滚动区之外

小程序视觉结构（自上而下）：
  系统状态栏 → 小程序自定义导航栏(custom-header) → 可滚动内容 → TabBar

v2 把 custom-header 留在了滚动区里，导致它跟着内容一起滚动、
且 header 的占位元素把布局撑开。v3 把它抽出来。
"""
import io
import os
import re

LAYOUTS = [
    ("index",              "首页",         0, True),
    ("knowledge",          "知识库",      -1, False),
    ("article",            "文章详情",    -1, False),
    ("document",           "文书生成",     1, True),
    ("complaint-form",     "民事起诉状",  -1, False),
    ("complaint-detail",   "起诉状预览",  -1, False),
    ("report-form",        "举报文书",    -1, False),
    ("report-detail",      "举报信预览",  -1, False),
    ("negotiation-form",   "协商函",      -1, False),
    ("negotiation-detail", "协商函预览",  -1, False),
    ("agency",             "维权代理",    -1, False),
    ("profile",            "我的",         2, True),
    ("my-documents",       "我的文书",    -1, False),
    ("search",             "搜索",        -1, False),
    ("list",               "我的收藏",    -1, False),
    ("document-article",   "文书解读",    -1, False),
    ("complaint-edit",     "编辑文书",    -1, False),
]

STATUS_BAR = """<div class="status-bar">
  <span class="sb-time">9:41</span>
  <span class="sb-right">
    <span class="sb-signal"></span><span class="sb-wifi"></span><span class="sb-battery"></span>
  </span>
</div>"""

TPL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · 衣律通小程序原型</title>
<link rel="stylesheet" href="css/app.css?v=3">
<link rel="stylesheet" href="css/components.css?v=3">
<link rel="stylesheet" href="css/tabbar.css?v=3">
<link rel="stylesheet" href="css/shell.css?v=3">
</head>
<body>
<div class="device">
  <div class="device-screen">
{statusbar}
{header}
    <div class="screen-scroll" id="screenScroll">
{content}
    </div>
{tabbar}
  </div>
  <div class="home-bar"></div>
</div>
{notes}
<script src="_proto.js?v=3"></script>
</body>
</html>
"""

NOTES = """<aside class="proto-notes">
  <h4>离线原型</h4>
  <div class="kv"><span>页面</span><b>{title}</b></div>
  <div class="kv"><span>尺寸</span><b>375 × 812</b></div>
  <div class="kv"><span>数据</span><b>59 篇文章</b></div>
  <div class="tip">由 WXML / WXSS 直接转换渲染。点击卡片可跳转。</div>
</aside>"""

# 页面 wxml 里 custom-header 的提取（用于提到滚动区外）
HEADER_RE = re.compile(r'<div class="cmp-custom_header">.*?</div>\s*(?=<div class="(?!brand|logo|header))',
                       re.S)


def scope(page):
    return "scope-" + page.replace("-", "_")


def extract_header(content, title):
    """把渲染结果里的 cmp-custom_header 抽出来"""
    m = re.search(r'(<div class="cmp-custom_header">)', content)
    if not m:
        return "", content

    start = m.start(1)
    # 花括号配平不一定准，改按标签配平
    i = start
    depth = 0
    j = i
    while j < len(content):
        open_m = content.find("<div", j)
        close_m = content.find("</div>", j)
        if close_m == -1:
            break
        if open_m != -1 and open_m < close_m:
            depth += 1
            j = open_m + 4
        else:
            depth -= 1
            j = close_m + 6
            if depth == 0:
                break
    header = content[start:j]
    rest = content[:start] + content[j:]
    return header, rest


def main():
    total = 0
    for page, title, tab, has_header in LAYOUTS:
        frag = "prototype/pages/%s.html" % page
        if not os.path.exists(frag):
            print("跳过:", page)
            continue

        content = io.open(frag, encoding="utf-8").read()
        header = ""
        header, content = extract_header(content, title)

        content = '<div class="page-scope %s">%s</div>' % (scope(page), content)

        tabbar = ""
        if tab >= 0:
            tp = "prototype/fragments/tabbar_%d.html" % tab
            if os.path.exists(tp):
                tabbar = '<div class="device-tabbar">%s</div>' % io.open(
                    tp, encoding="utf-8").read()

        html = TPL.format(
            title=title, statusbar=STATUS_BAR, header=header,
            content=content, tabbar=tabbar, notes=NOTES.format(title=title),
        )
        with io.open("prototype/%s.html" % page, "w", encoding="utf-8") as fh:
            fh.write(html)
        total += 1
        print("✅ %-22s header=%-5s tab=%-2s" % (page, bool(header), tab if tab >= 0 else "-"))
    print("\n共生成 %d 个页面" % total)


if __name__ == "__main__":
    main()
