# -*- coding: utf-8 -*-
"""
重写 wxss2css 的 build：
  1. app.wxss 的 page {} → :root（CSS 变量必须挂在根上）
  2. 页面 wxss 的每条选择器加 .scope-xxx 前缀（而不是把整份 CSS 包进一个块）
     因为 CSS 不支持随意嵌套，包块会导致全部规则失效
"""
import io
import os
import re

# 复用 component_render 里已经写好的 scope_css
import sys
sys.path.insert(0, "tools")
from component_render import scope_css

PAGES_OUT = "prototype/pages"


def build(base_css, app_wxss, page_map, out_path):
    from wxss2css import convert

    parts = []

    # 1) 基础外壳样式
    if os.path.exists(base_css):
        parts.append(io.open(base_css, encoding="utf-8").read())

    # 2) app.wxss → 全局（page → :root，变量才生效）
    if os.path.exists(app_wxss):
        parts.append("/* ================= app.wxss ================= */")
        parts.append(convert(io.open(app_wxss, encoding="utf-8").read(), is_app=True))

    # 3) 各页面 wxss，选择器加作用域前缀
    for page, path in page_map:
        if not os.path.exists(path):
            continue
        css = io.open(path, encoding="utf-8").read()
        scoped = scope_css(css, "scope-" + page.replace("-", "_"))
        parts.append("/* ================= %s.wxss ================= */" % page)
        parts.append(scoped)

    out = "\n\n".join(parts)
    with io.open(out_path, "w", encoding="utf-8") as fh:
        fh.write(out)
    return len(out)


if __name__ == "__main__":
    from build_prototype import PAGES

    os.makedirs("prototype/css", exist_ok=True)
    page_map = [("%s" % p, "miniprogram/pages/%s/%s.wxss" % (p, p)) for p in PAGES]
    n = build("prototype/css/_base.css", "miniprogram/app.wxss",
              page_map, "prototype/css/app.css")
    print("✅ prototype/css/app.css (%d 字符, %.1f KB)" % (n, n / 1024))
