# -*- coding: utf-8 -*-
"""
WXML → HTML 转换器

微信小程序 WXML 与 HTML 的差异主要在这些标签和指令：
  view/scroll-view  → div
  text              → span
  image             → img（mode 需转 object-fit）
  swiper/swiper-item→ 轮播容器（静态版只渲染第一屏 + 圆点）
  block             → 透传（不带标签）
  wx:for / wx:if    → 由渲染器处理（本转换器先保留为 data-* 标记）

本模块只做「语法层」转换，数据绑定 {{}} 交给 renderer 用 Python 求值。
"""
import re

TAG_MAP = {
    "view": "div",
    "scroll-view": "div",
    "text": "span",
    "image": "img",
    "swiper": "div",
    "swiper-item": "div",
    "block": None,          # 透传，不产生标签
    "navigator": "a",
    "input": "input",
    "textarea": "textarea",
    "button": "button",
    "picker": "div",
    "switch": "div",
}

# 需要丢弃的属性（小程序专有事件/能力）
DROP_ATTR_PREFIX = ("bind", "catch", "mut-bind", "capture-bind", "capture-catch")
DROP_ATTRS = {
    "wx:key", "wx:for-index", "wx:for-item", "enhanced", "bounces",
    "scroll-y", "scroll-x", "show-scrollbar", "scroll-with-animation",
    "enable-flex", "using-stores", "mode", "lazy-load", "webp", "show-menu-by-longpress",
    "hover-class", "hover-stop-propagation", "hover-start-time", "hover-stay-time",
    "maxlength", "cursor-spacing", "confirm-type", "adjust-position",
    "auto-height", "show-confirm-bar", "cursor", "focus", "adjust-position",
}

TAG_RE = re.compile(r"<(/)?([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'))?)*)\s*(/)?>")
ATTR_RE = re.compile(r"([^\s=/>]+)(?:\s*=\s*(\"([^\"]*)\"|'([^']*)'|([^\s>]+)))?")


def parse_attrs(s):
    out = []
    for m in ATTR_RE.finditer(s):
        name = m.group(1)
        val = m.group(3)
        if val is None:
            val = m.group(4)
        if val is None:
            val = m.group(5)
        out.append((name, val))
    return out


def attr_to_html(name, val, tag):
    """返回 (html_attr_string) 或 None 表示丢弃"""
    # img 的 src / mode 优先处理（mode 同时也在 DROP_ATTRS 里，必须先判断）
    if tag in ("img", "image"):
        if name == "src":
            return "src=%s" % quote(val)
        if name == "mode":
            fitting = {
                "aspectFit": "contain",
                "aspectFill": "cover",
                "scaleToFill": "fill",
                "widthFix": "cover",
                "heightFix": "cover",
            }.get(val, "cover")
            return 'data-fit="%s"' % fitting

    if name in DROP_ATTRS:
        return None
    for p in DROP_ATTR_PREFIX:
        if name.startswith(p):
            return None

    if name == "class":
        return "class=%s" % quote(val)
    if name == "style":
        return "style=%s" % quote(val)
    if name == "id":
        return "id=%s" % quote(val)

    if name == "placeholder":
        return "placeholder=%s" % quote(val)
    if name == "value":
        # textarea 的 value 要作为标签内容，不能当属性
        if tag == "textarea":
            return None
        return "value=%s" % quote(val)
    if name == "type" and val in ("text", "number", "idcard", "digit"):
        return 'type="text"'
    if name == "password":
        return 'type="password"'
    if name in ("autoplay", "circular", "disabled", "checked", "transparent",
                "noPlaceholder", "scroll-y", "scroll-x"):
        return 'data-flag="%s"' % name
    if name.startswith("wx:"):
        return None
    return 'data-%s=%s' % (name, quote(val if val is not None else ""))


def quote(v):
    if v is None:
        return '""'
    return '"%s"' % v.replace('"', "&quot;")


def convert(wxml):
    """
    把 WXML 字符串转成 HTML 字符串。
    - 保留 {{}} 绑定原样（交给 renderer）
    - view→div, text→span, image→img ...
    - block 透传
    """
    out = []
    pos = 0
    open_stack = []

    for m in TAG_RE.finditer(wxml):
        # 原样输出标签之间的文本
        out.append(wxml[pos:m.start()])
        pos = m.end()

        closing, tag, attrstr, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)

        if tag not in TAG_MAP and not tag.startswith("custom-") and tag not in (
                "icon", "checkbox", "radio", "slider", "form", "label"):
            # 未知标签原样保留（可能是自定义组件）
            out.append(m.group(0))
            continue

        html_tag = TAG_MAP.get(tag, "div")

        if closing:
            if html_tag is None:
                continue  # block 闭合，不输出
            out.append("</%s>" % html_tag)
            continue

        attrs = parse_attrs(attrstr or "")
        kept = []
        for name, val in attrs:
            a = attr_to_html(name, val, tag)
            if a:
                kept.append(a)
        attr_s = (" " + " ".join(kept)) if kept else ""

        if tag == "image":
            # 自闭合 img
            out.append("<img%s />" % attr_s)
            continue

        if selfclose:
            if html_tag is None:
                continue
            out.append("<%s%s />" % (html_tag, attr_s))
            continue

        if html_tag is None:
            continue  # block 开始，不输出

        out.append("<%s%s>" % (html_tag, attr_s))

    out.append(wxml[pos:])
    return "".join(out)


def strip_comments(html):
    return re.sub(r"<!--.*?-->", "", html, flags=re.S)


if __name__ == "__main__":
    demo = '''<view class="a {{x}}">
  <text class="b">{{title}}</text>
  <image src="{{img}}" mode="aspectFill"/>
  <block wx:for="{{list}}"><view>{{item}}</view></block>
</view>'''
    print(convert(demo))
