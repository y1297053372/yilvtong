# -*- coding: utf-8 -*-
"""
小程序内置组件的语义渲染

问题背景：
    之前只把 <swiper> → <div>、<picker> → <div> 做了标签名替换，
    但这些组件在微信里有**内置行为**，光换标签会丢样式和结构：

    <swiper>      横向轮播，子项并排，只显示一个 → 必须 overflow:hidden + 横向排列
    <swiper-item> 绝对定位叠放，靠 translate 切换
    <scroll-view> 独立滚动容器（scroll-x / scroll-y）
    <rich-text>   渲染 nodes 富文本
    <picker>      右侧箭头 + 选中值展示
    <radio>       圆形选择框（小程序自带样式）
    <checkbox>    方形勾选框
    <icon>        内置图标集

    本模块为每个组件生成「等价 HTML + 必要的内联样式/结构」。
"""
import re


def esc(v):
    if v is None:
        return ""
    return str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


# ---------------------------------------------------------------- swiper

def render_swiper(node, ctx, render_children, interp):
    """
    swiper：横向轮播
    - 容器：overflow hidden，子项横向排列，宽度 100%
    - 每个 swiper-item 并排，只显示第一个（静态原型不做动画）
    """
    style = interp(node.attr("style") or "", ctx)
    cls = interp(node.attr("class") or "", ctx)
    h = ""
    m = re.search(r"height\s*:\s*([^;]+)", style)
    if m:
        h = m.group(1).strip()

    inner = render_children(node, ctx)

    # 把子项包进一条横向轨道
    h_style = ("height:%s;" % h) if h else ""
    # 注意：不覆盖 class 里已有的圆角/阴影，只补必要的布局属性
    # 内层 track 与 item 都要 height:100%，否则图片按原图比例撑高
    return (
        '<div class="wx-swiper %s" style="position:relative;%s">'
        '<div class="wx-swiper-track" style="display:flex;flex-direction:row;'
        'width:100%%;height:100%%;">%s</div>'
        "</div>" % (esc(cls), h_style, inner)
    )


def render_swiper_item(node, ctx, render_children):
    from wxml_render import interp as _i
    cls = _i(node.attr("class") or "", ctx)
    return ('<div class="wx-swiper-item %s" style="flex:0 0 100%%;width:100%%;'
            'height:100%%;overflow:hidden;">%s</div>'
            % (esc(cls), render_children(node, ctx)))


# ------------------------------------------------------------ scroll-view

def render_scroll_view(node, ctx, render_children):
    """
    scroll-view：独立滚动容器
    scroll-x 横向滚动，scroll-y 纵向滚动
    """
    from wxml_render import interp as _i
    cls = _i(node.attr("class") or "", ctx)
    style = _i(node.attr("style") or "", ctx)
    has_x = node.has("scroll-x")
    has_y = node.has("scroll-y")

    dirs = []
    if has_x:
        dirs.append("overflow-x:auto;overflow-y:hidden;")
    if has_y:
        dirs.append("overflow-y:auto;overflow-x:hidden;")
    if not dirs:
        dirs.append("overflow:auto;")

    return ('<div class="wx-scroll-view %s" style="%s%s-webkit-overflow-scrolling:touch;'
            'scrollbar-width:none;">%s</div>'
            % (esc(cls), esc(style) + ";" if style else "", "".join(dirs),
               render_children(node, ctx)))


# ------------------------------------------------------------- rich-text

def render_rich_text(node, ctx, interp):
    """rich-text：nodes 属性是 HTML 字符串或节点数组"""
    nodes = node.attr("nodes")
    if nodes:
        html = interp(nodes, ctx) if "{{" in nodes else nodes
        return '<div class="wx-rich-text">%s</div>' % html
    return ""


# ---------------------------------------------------------------- picker

def render_picker(node, ctx, render_children, interp):
    """
    picker：小程序里是「点击弹选择器」，视觉上是
    [ 当前值文本            ▾ ]
    这里渲染成带右侧箭头的只读行。
    """
    cls = interp(node.attr("class") or "", ctx)
    mode = node.attr("mode") or "selector"
    inner = render_children(node, ctx)

    # 取 value 里选中的文字（简化：显示子节点内容或占位）
    placeholder = "请选择"
    for a, v in node.attrs:
        if a == "placeholder" or a == "title":
            placeholder = v or placeholder

    # 子节点为空时给个占位
    if not inner.strip():
        inner = '<span class="wx-picker-value wx-placeholder">%s</span>' % esc(placeholder)

    return ('<div class="wx-picker %s" style="display:flex;align-items:center;'
            'justify-content:space-between;gap:8px;">'
            '<div class="wx-picker-content" style="flex:1;min-width:0;">%s</div>'
            '<span class="wx-picker-arrow" style="flex-shrink:0;opacity:.45;">›</span>'
            "</div>" % (esc(cls), inner))


# ----------------------------------------------------------------- radio

def render_radio(node, ctx):
    """
    radio：圆形选择框
    小程序自带样式，被 checked 时显示实心圆点。
    注意：项目里 radio 常设 display:none，真正视觉由自定义 div 承担，
    所以这里保持 hidden 行为，但要输出可识别结构。
    """
    style = node.attr("style") or ""
    checked = node.has("checked")
    val = node.attr("value") or ""
    cls = node.attr("class") or ""

    if "display:none" in style.replace(" ", ""):
        return ('<span class="wx-radio wx-radio-hidden" data-value="%s" '
                'style="display:none;"></span>' % esc(val))

    dot = ('<span style="width:8px;height:8px;border-radius:50%;background:#1152d4;'
           'display:block;"></span>') if checked else ""
    return ('<span class="wx-radio %s" data-value="%s" style="display:inline-flex;'
            'align-items:center;justify-content:center;width:20px;height:20px;'
            'border-radius:50%%;border:1.5px solid %s;box-sizing:border-box;">%s</span>'
            % (esc(cls), esc(val), "#1152d4" if checked else "#cbd5e1", dot))


# -------------------------------------------------------------- checkbox

def render_checkbox(node, ctx):
    style = node.attr("style") or ""
    checked = node.has("checked")
    val = node.attr("value") or ""
    cls = node.attr("class") or ""

    if "display:none" in style.replace(" ", ""):
        return ('<span class="wx-checkbox wx-checkbox-hidden" data-value="%s" '
                'style="display:none;"></span>' % esc(val))

    mark = "✓" if checked else ""
    return ('<span class="wx-checkbox %s" data-value="%s" style="display:inline-flex;'
            'align-items:center;justify-content:center;width:18px;height:18px;'
            'border-radius:4px;border:1.5px solid %s;box-sizing:border-box;'
            'font-size:12px;color:#fff;background:%s;">%s</span>'
            % (esc(cls), esc(val), "#1152d4" if checked else "#cbd5e1",
               "#1152d4" if checked else "transparent", mark))


# ------------------------------------------------------------------ icon

def render_icon(node, ctx):
    """icon：微信内置图标，用字符近似"""
    t = node.attr("type") or "info"
    size = node.attr("size") or "18"
    color = node.attr("color") or "#999"
    glyph = {
        "success": "✓", "info": "i", "warn": "!",
        "waiting": "…", "cancel": "✕", "clear": "✕",
        "search": "⌕", "download": "↓",
    }.get(t, "•")
    return ('<span class="wx-icon" style="display:inline-flex;align-items:center;'
            'justify-content:center;width:%spx;height:%spx;color:%s;font-size:%spx;">'
            "%s</span>" % (esc(size), esc(size), esc(color), esc(size), glyph))


# --------------------------------------------------------------- button

def render_button(node, ctx, render_children):
    """button：小程序 button 有默认样式（块级、居中、圆角）"""
    from wxml_render import interp as _i
    cls = _i(node.attr("class") or "", ctx)
    style = _i(node.attr("style") or "", ctx)
    open_type = node.attr("open-type") or ""
    inner = render_children(node, ctx)
    return ('<button class="wx-button %s" data-open-type="%s" style="%s">%s</button>'
            % (esc(cls), esc(open_type), esc(style), inner))


# --------------------------------------------------------------- 分发

def render_builtin(node, ctx, render_children, interp):
    """
    返回 HTML 字符串，或 None 表示不是内置组件（走默认处理）。
    """
    t = node.tag
    if t == "swiper":
        return render_swiper(node, ctx, render_children, interp)
    if t == "swiper-item":
        return render_swiper_item(node, ctx, render_children)
    if t == "scroll-view":
        return render_scroll_view(node, ctx, render_children)
    if t == "rich-text":
        return render_rich_text(node, ctx, interp)
    if t == "picker":
        return render_picker(node, ctx, render_children, interp)
    if t == "radio":
        return render_radio(node, ctx)
    if t == "checkbox":
        return render_checkbox(node, ctx)
    if t == "icon":
        return render_icon(node, ctx)
    if t == "button":
        return render_button(node, ctx, render_children)
    return None
