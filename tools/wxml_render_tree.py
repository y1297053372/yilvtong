# -*- coding: utf-8 -*-
"""
WXML → HTML 完整渲染器（树式）

流程：
    WXML 文本
      → parse_tree()   建节点树（保留 wx:for / wx:if 等指令）
      → render_node()  递归渲染，处理循环与条件、求值 {{}}
      → HTML 片段

与 wxml2html 的分工：
    wxml2html 负责「标签和属性」的语义映射
    本模块负责「结构」——循环、条件、作用域
"""
import re

from wxml2html import TAG_MAP, parse_attrs, attr_to_html, quote
from wxml_render import interp, eval_expr, truthy, to_str


class Node:
    __slots__ = ("tag", "attrs", "children", "text", "parent")

    def __init__(self, tag=None, attrs=None, text=None):
        self.tag = tag
        self.attrs = attrs or []
        self.children = []
        self.text = text
        self.parent = None

    def attr(self, name):
        for k, v in self.attrs:
            if k == name:
                return v
        return None

    def has(self, name):
        return any(k == name for k, _ in self.attrs)

    def __repr__(self):
        if self.tag is None:
            return "Text(%r)" % (self.text or "")[:20]
        return "<%s %s>" % (self.tag, " ".join(k for k, _ in self.attrs))


# ---------------- 解析 ----------------

TOKEN_RE = re.compile(
    r"<!--.*?-->"
    r"|<(/?)([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'))?)*)\s*(/?)>"
    r"|([^<]+)",
    re.S,
)

VOID_TAGS = {"image", "input", "icon", "br"}


WXS_RE = re.compile(r"<wxs[^>]*>.*?</wxs>", re.S)


def parse_tree(wxml):
    # <wxs> 是小程序内联脚本，静态原型用不到，整块丢弃
    wxml = WXS_RE.sub("", wxml)
    root = Node("#root")
    cur = root
    pos = 0
    for m in TOKEN_RE.finditer(wxml):
        # 处理未匹配的残余（理论上不会有）
        if m.start() > pos:
            cur.children.append(Node(None, text=wxml[pos:m.start()]))
        pos = m.end()

        if m.group(0).startswith("<!--"):
            continue

        closing, tag, attrstr, selfclose, text = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)

        if text is not None:
            if text.strip() or "\u00a0" in text:
                n = Node(None, text=text)
                n.parent = cur
                cur.children.append(n)
            continue

        if closing:
            if cur.tag == tag:
                cur = cur.parent
            else:
                # 容错：向上找
                p = cur
                while p is not None and p.tag != tag:
                    p = p.parent
                if p is not None and p.parent is not None:
                    cur = p.parent
            continue

        node = Node(tag, parse_attrs(attrstr or ""))
        node.parent = cur
        cur.children.append(node)

        if not selfclose and tag not in VOID_TAGS:
            cur = node
    return root


# ---------------- 渲染 ----------------

SKIP_TAGS = {"wxs", "custom-tab-bar"}

# 由外部注入的组件渲染钩子（component_render.ComponentRenderer）
COMPONENT_HOOK = None



def norm_tag(tag):
    if tag in TAG_MAP:
        return TAG_MAP[tag]
    if tag in SKIP_TAGS:
        return None          # 组件不渲染
    if tag.startswith("custom-"):
        # 有渲染钩子时交给组件渲染，否则跳过
        return "__component__" if COMPONENT_HOOK else None
    return "div"


def render_children(node, ctx):
    out = []
    children = node.children
    i = 0
    # 先处理 wx:if / wx:elif / wx:else 链
    while i < len(children):
        ch = children[i]
        if ch.tag is not None and (ch.has("wx:if") or ch.has("wx:elif") or ch.has("wx:else")):
            # 收集整条链
            chain = [ch]
            j = i + 1
            while j < len(children):
                nxt = children[j]
                if nxt.tag is not None and (nxt.has("wx:elif") or nxt.has("wx:else")):
                    chain.append(nxt)
                    j += 1
                elif nxt.tag is None and (nxt.text or "").strip() == "":
                    j += 1          # 跳过空白文本
                else:
                    break
            out.append(render_if_chain(chain, ctx))
            i = j
            continue
        out.append(render_node(ch, ctx))
        i += 1
    return "".join(out)


def unwrap(expr):
    """去掉属性值外层的 {{ }}，返回纯表达式"""
    if expr is None:
        return ""
    e = expr.strip()
    if e.startswith("{{") and e.endswith("}}"):
        e = e[2:-2].strip()
    return e


def render_if_chain(chain, ctx):
    # 链必须以 wx:if 开头；孤立的 wx:elif / wx:else（前面没有 if）不渲染
    if not chain or not chain[0].has("wx:if"):
        return ""
    for node in chain:
        if node.has("wx:else"):
            return render_node(node, ctx, skip_cond=True)
        if node.has("wx:if"):
            if truthy(eval_expr(unwrap(node.attr("wx:if")), ctx)):
                return render_node(node, ctx, skip_cond=True)
        elif node.has("wx:elif"):
            if truthy(eval_expr(unwrap(node.attr("wx:elif")), ctx)):
                return render_node(node, ctx, skip_cond=True)
    return ""


def render_node(node, ctx, skip_cond=False, skip_for=False):
    # 纯文本
    if node.tag is None:
        return interp(node.text or "", ctx)

    # 循环（skip_for 防止 render_for 内部再次进入死循环）
    if node.has("wx:for") and not skip_for:
        return render_for(node, ctx)

    if not skip_cond:
        if node.has("wx:if") and not truthy(eval_expr(unwrap(node.attr("wx:if")), ctx)):
            return ""
        if node.has("wx:elif") or node.has("wx:else"):
            return ""

    # mp-html：富文本渲染组件，直接把 content 属性展开成 HTML
    if node.tag == "mp-html":
        c = node.attr("content")
        if c:
            from wxml_render import interp as _interp
            return '<div class="mp-html">%s</div>' % _interp(c, ctx)
        return ""

    html_tag = norm_tag(node.tag)

    # 自定义组件：交给钩子渲染（含 slot 内容）
    if html_tag == "__component__":
        inner = render_children(node, ctx)
        attrs = {}
        for name, val in node.attrs:
            if name.startswith("wx:"):
                continue
            attrs[name] = val
        # 组件标签上的 class 也要传
        return COMPONENT_HOOK.render(node.tag, attrs, inner, ctx)

    if html_tag is None:
        return ""

    # hidden 属性
    style_extra = ""
    hv = node.attr("hidden")
    if hv:
        val = hv
        if "{{" in val:
            if truthy(eval_expr(unwrap(val), ctx)):
                style_extra = "display:none;"
        elif val == "true":
            style_extra = "display:none;"

    attr_parts = []
    for name, val in node.attrs:
        if name.startswith("wx:"):
            continue
        v = interp(val if val is not None else "", ctx) if val else val
        a = attr_to_html(name, v, node.tag)
        if a:
            attr_parts.append(a)

    if style_extra:
        # 合并到 style
        merged = style_extra
        newp = []
        for a in attr_parts:
            if a.startswith("style="):
                inner = a[7:-1].strip('"')
                merged = inner + ";" + style_extra
                continue
            newp.append(a)
        newp.append('style="%s"' % merged)
        attr_parts = newp

    attr_s = (" " + " ".join(attr_parts)) if attr_parts else ""

    if node.tag == "image":
        return "<img%s />" % attr_s

    if node.tag in ("input", "textarea"):
        inner = ""
        if node.tag == "textarea":
            # textarea 的 value 要作为标签内容显示
            v = node.attr("value")
            inner = interp(v, ctx) if v else render_children(node, ctx)
        else:
            v = node.attr("value")
            if v and "value=" not in attr_s:
                attr_s += ' value="%s"' % interp(v, ctx).replace('"', "&quot;")
        return "<%s%s>%s</%s>" % (html_tag, attr_s, inner, html_tag)

    inner = render_children(node, ctx)
    return "<%s%s>%s</%s>" % (html_tag, attr_s, inner, html_tag)


def render_for(node, ctx):
    seq = eval_expr(unwrap(node.attr("wx:for")), ctx)

    item_name = (node.attr("wx:for-item") or "item").strip()
    index_name = (node.attr("wx:for-index") or "index").strip()

    if not isinstance(seq, (list, tuple)):
        if isinstance(seq, dict):
            seq = list(seq.values())
        elif isinstance(seq, (int, float)):
            seq = list(range(int(seq)))
        else:
            seq = []

    out = []
    for idx, item in enumerate(seq):
        sub = dict(ctx)
        sub[item_name] = item
        sub[index_name] = idx
        out.append(render_node(node, sub, skip_cond=True, skip_for=True))
    return "".join(out)


def render(wxml, ctx):
    tree = parse_tree(wxml)
    return render_children(tree, ctx)
