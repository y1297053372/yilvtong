# -*- coding: utf-8 -*-
"""
WXSS → CSS 转换

主要差异：
  1. rpx 单位 —— 750rpx = 屏宽。原型按 375px 宽设计（iPhone 标准逻辑像素）
     → 1rpx = 0.5px
  2. page 选择器 → .page-root（或用 :root 承载 CSS 变量）
  3. @import 需要内联或转成 link
  4. 小程序特有伪类/属性（hover-class 等）忽略
"""
import io
import os
import re

RPX = 0.5          # 375 / 750
DESIGN_WIDTH = 375


def rpx_to_px(css):
    """把 N rpx 转成 (N*0.5)px，保留两位小数"""
    def rep(m):
        v = float(m.group(1))
        px = v * RPX
        if px == int(px):
            return "%dpx" % int(px)
        return ("%.2f" % px).rstrip("0").rstrip(".") + "px"

    return re.sub(r"(-?\d+(?:\.\d+)?)\s*rpx", rep, css)


def fix_page_selector(css):
    """
    把 page 选择器替换成 body.page-root（不替换变量名里的 page）。

    只在「选择器位置」替换：行首或 } 之后，且 page 后面紧跟空白+{ 或逗号。
    """
    # page { ... }  或  page,  .x { ... }
    pattern = re.compile(r"(^|})\s*page\s*(?=[{,])", re.M)

    def rep(m):
        return m.group(1) + " body.page-root"

    return pattern.sub(rep, css)


def strip_dark_mode(css):
    """
    去掉小程序里的深色模式分支。

    原型固定用浅色模式交付，原因：
    - 小程序的深色模式依赖 wx.getSystemInfo 的 theme，与浏览器的
      prefers-color-scheme 语义不同，直接搬运会出现"黑底黑字"或
      "浅底白字"的错配（实测：系统深色时 active 标签变白、看不见）
    - 评审看作品时，统一浅色更接近产品截图

    处理：删除 @media (prefers-color-scheme: dark) { ... } 整块。
    """
    out = []
    i = 0
    pat = re.compile(r"@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{")
    while True:
        m = pat.search(css, i)
        if not m:
            out.append(css[i:])
            break
        out.append(css[i:m.start()])
        # 从 m.end() 开始做花括号配对
        depth = 1
        j = m.end()
        while j < len(css) and depth > 0:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        i = j
    return "".join(out)


def convert(css, is_app=False):
    css = strip_dark_mode(css)
    css = rpx_to_px(css)
    css = fix_page_selector(css)
    if is_app:
        css = css.replace("body.page-root", ":root")
    return css


def build(app_wxss, page_wxss_map, out_path):
    parts = []
    # 1. 基础重置 + 原型外壳
    parts.append(io.open("prototype/css/_base.css", encoding="utf-8").read())

    # 2. app.wxss（全局变量与通用类）
    if os.path.exists(app_wxss):
        parts.append("/* ===== app.wxss ===== */")
        parts.append(convert(io.open(app_wxss, encoding="utf-8").read(), is_app=True))

    # 3. 各页面样式（带作用域前缀，避免互相污染）
    for page, path in page_wxss_map:
        if not os.path.exists(path):
            continue
        css = io.open(path, encoding="utf-8").read()
        css = strip_dark_mode(css)
        css = rpx_to_px(css)
        # page 选择器在页面级 wxss 里表示根容器
        css = re.sub(r"(^|\})\s*page\s*\{", r"\1 .page-scope {", css)
        parts.append("/* ===== %s.wxss ===== */" % page)
        parts.append("." + scope_class(page) + " {\n" + indent(css) + "\n}")

    out = "\n\n".join(parts)
    with io.open(out_path, "w", encoding="utf-8") as fh:
        fh.write(out)
    return len(out)


def scope_class(page):
    return "scope-" + page.replace("-", "_")


def indent(s, n=2):
    pad = " " * n
    return "\n".join(pad + ln if ln.strip() else ln for ln in s.split("\n"))


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "tools")
    from build_prototype import PAGES

    os.makedirs("prototype/css", exist_ok=True)
    page_map = []
    for p in PAGES:
        path = "miniprogram/pages/%s/%s.wxss" % (p, p)
        page_map.append((p, path))

    n = build("miniprogram/app.wxss", page_map, "prototype/css/app.css")
    print("✅ prototype/css/app.css  (%d 字符, %.1f KB)" % (n, n / 1024))
