# -*- coding: utf-8 -*-
"""
小程序自定义组件渲染

之前为了快速出效果，把 custom-header / custom-tab-bar 直接跳过了，
用自己画的手机壳顶栏和底栏代替。这样 UI 与原版不一致。

本模块把组件真正渲染出来：
  - 读取组件的 wxml / wxss / json
  - 组件属性（写在标签上的 prop）合并进组件默认 data
  - slot 内容替换到组件内的 <slot>
  - 组件 wxss 单独输出，前缀 .cmp-<name> 做作用域隔离
"""
import io
import json
import os
import re

from wxml_render_tree import parse_tree, render_children, render_node, SKIP_TAGS

COMPONENT_DIRS = {
    "custom-header": "miniprogram/components/custom-header",
    "sub-header": "miniprogram/components/sub-header",
    "privacy-consent": "miniprogram/components/privacy-consent",
    "skeleton": "miniprogram/components/skeleton",
}
TABBAR_DIR = "miniprogram/custom-tab-bar"


def load_component(name):
    d = COMPONENT_DIRS.get(name)
    if not d:
        return None
    base = os.path.join(d, name)
    out = {}
    for ext in ("wxml", "wxss", "json", "js"):
        p = base + "." + ext
        out[ext] = io.open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    return out


def load_tabbar():
    base = os.path.join(TABBAR_DIR, "index")
    out = {}
    for ext in ("wxml", "wxss", "js"):
        p = base + "." + ext
        out[ext] = io.open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    return out


def _extract_object(js_src, key):
    """抓出 key: { ... } 的对象字面量文本（做花括号配对）"""
    m = re.search(key + r"\s*:\s*\{", js_src)
    if not m:
        return ""
    i = m.end()
    depth = 1
    j = i
    while j < len(js_src) and depth > 0:
        if js_src[j] == "{":
            depth += 1
        elif js_src[j] == "}":
            depth -= 1
        j += 1
    return js_src[i:j - 1]


SCALAR_RE = re.compile(
    r"(\w+)\s*:\s*"
    r"(?:"
    r"'([^']*)'"          # 单引号字符串
    r"|\"([^\"]*)\""   # 双引号字符串
    r"|(-?\d+(?:\.\d+)?)"  # 数字
    r"|(true|false)"      # 布尔
    r")"
)


def component_defaults(js_src):
    """
    提取组件的默认数据，合并两处：
      1. properties: { title: { type: String, value: '衣律通' } }
      2. data: { navBarHeight: 0 }
    """
    defaults = {}

    # ---- properties 里的 value ----
    props = _extract_object(js_src, "properties")
    if props:
        # 每个 prop 形如  name: { type: X, value: Y }
        for m in re.finditer(r"(\w+)\s*:\s*\{", props):
            name = m.group(1)
            # 取这个小对象的内容
            i = m.end()
            depth = 1
            j = i
            while j < len(props) and depth > 0:
                if props[j] == "{":
                    depth += 1
                elif props[j] == "}":
                    depth -= 1
                j += 1
            body = props[i:j - 1]
            vm = re.search(
                r"value\s*:\s*"
                r"(?:'([^']*)'|\"([^\"]*)\"|(-?\d+(?:\.\d+)?)|(true|false))",
                body)
            if vm:
                if vm.group(1) is not None:
                    defaults[name] = vm.group(1)
                elif vm.group(2) is not None:
                    defaults[name] = vm.group(2)
                elif vm.group(3) is not None:
                    v = vm.group(3)
                    defaults[name] = float(v) if "." in v else int(v)
                elif vm.group(4) is not None:
                    defaults[name] = (vm.group(4) == "true")

    # ---- data 里的标量 ----
    data_body = _extract_object(js_src, "data")
    if data_body:
        for mm in SCALAR_RE.finditer(data_body):
            name = mm.group(1)
            if mm.group(2) is not None:
                defaults[name] = mm.group(2)
            elif mm.group(3) is not None:
                defaults[name] = mm.group(3)
            elif mm.group(4) is not None:
                v = mm.group(4)
                defaults[name] = float(v) if "." in v else int(v)
            elif mm.group(5) is not None:
                defaults[name] = (mm.group(5) == "true")

    return defaults


class ComponentRenderer:
    def __init__(self, base_ctx):
        self.base_ctx = base_ctx
        self.cache = {}
        self.used = set()

    def get(self, name):
        if name not in self.cache:
            self.cache[name] = load_component(name)
        return self.cache[name]

    def render(self, name, attrs, inner_html, ctx):
        comp = self.get(name)
        if not comp or not comp["wxml"]:
            return ""

        self.used.add(name)

        # 组件 data 的组装顺序（后者覆盖前者）：
        #   1. 组件 data 默认值（多为 0，运行时由 lifetime 计算）
        #   2. 页面传入的 prop
        #   3. 页面级全局尺寸（navBarHeight 等，模拟组件 attached 的计算结果）
        cdata = {}

        # 1) 组件默认值
        cdata.update(component_defaults(comp["js"]))

        # 2) 页面传入的 prop（这是最权威的，排在默认值之后）
        for k, v in attrs.items():
            if k in ("class", "id", "style"):
                continue
            if v is None:
                v = ""
            v = v.strip()
            if v.startswith("{{") and v.endswith("}}"):
                from wxml_render import eval_expr
                cdata[k] = eval_expr(v[2:-2], ctx)
            elif v.startswith("{{") and v.endswith("}}") is False and "{{" in v:
                from wxml_render import interp
                cdata[k] = interp(v, ctx)
            else:
                cdata[k] = v

        # 3) 全局尺寸：组件里这些值通常是 0，靠 attached 计算；
        #    原型直接用页面上下文的真实值（模拟计算结果）
        for k in ("navBarHeight", "statusBarHeight", "contentHeight"):
            if k in ctx and (cdata.get(k) in (0, "0", None, "")):
                cdata[k] = ctx[k]

        # 渲染组件 wxml
        wxml = comp["wxml"]
        # 处理 slot：把页面传入的内容塞进去
        if "<slot" in wxml:
            wxml = re.sub(r"<slot\s*/?>", inner_html or "", wxml)

        html = render_children(parse_tree(wxml), cdata)
        return '<div class="cmp-%s">%s</div>' % (name.replace("-", "_"), html)

    def component_css(self):
        parts = []
        for name in sorted(self.used):
            comp = self.get(name)
            if not comp or not comp["wxss"]:
                continue
            css = scope_css(comp["wxss"], "cmp-" + name.replace("-", "_"))
            parts.append("/* ===== component: %s ===== */" % name)
            parts.append(css)
        return "\n\n".join(parts)


def tabbar_html(selected, ctx):
    comp = load_tabbar()
    if not comp or not comp["wxml"]:
        return "", ""
    from wxml_render import eval_expr
    from wxml_render_tree import parse_tree, render_children
    from wxss2css import strip_dark_mode, rpx_to_px

    list_src = comp["js"]
    tabs = []
    for m in re.finditer(
        r"pagePath\s*:\s*['\"]([^'\"]+)['\"].*?text\s*:\s*['\"]([^'\"]+)['\"].*?"
        r"iconPath\s*:\s*['\"]([^'\"]+)['\"].*?selectedIconPath\s*:\s*['\"]([^'\"]+)['\"]",
        list_src, re.S
    ):
        tabs.append({
            "pagePath": m.group(1), "text": m.group(2),
            "iconPath": m.group(3), "selectedIconPath": m.group(4),
        })

    data = {"list": tabs, "selected": selected}
    data.update({k: ctx[k] for k in ("navBarHeight", "statusBarHeight") if k in ctx})

    html = render_children(parse_tree(comp["wxml"]), data)

    css = strip_dark_mode(comp["wxss"])
    css = rpx_to_px(css)
    return html, css

def scope_css(css, scope_cls):
    """
    给 CSS 的每条选择器加作用域前缀。
    - 跳过 @media / @keyframes / @font-face 等 at-rule 的头部
    - page 选择器映射到作用域根
    """
    from wxss2css import strip_dark_mode, rpx_to_px

    # 先去掉注释，否则注释会被当成选择器的一部分
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = strip_dark_mode(css)
    css = rpx_to_px(css)

    out = []
    i = 0
    n = len(css)

    while i < n:
        # 找下一个规则块的开始
        brace = css.find("{", i)
        if brace < 0:
            out.append(css[i:])
            break

        sel = css[i:brace]
        # 找配对的大括号
        depth = 1
        j = brace + 1
        while j < n and depth > 0:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1

        body = css[brace + 1:j - 1]
        sel_stripped = sel.strip()

        # at-rule：递归处理内部
        if sel_stripped.startswith("@media") or sel_stripped.startswith("@supports"):
            inner = scope_css(body, scope_cls)
            out.append("%s{\n%s\n}" % (sel_stripped, inner))
            i = j
            continue

        if sel_stripped.startswith("@keyframes") or sel_stripped.startswith("@font-face"):
            out.append("%s{%s}" % (sel_stripped, body))
            i = j
            continue

        # 普通选择器：逐条加前缀
        scoped_sels = []
        for one in sel_stripped.split(","):
            one = one.strip()
            if not one:
                continue
            if one == "page" or one.startswith("page "):
                one = one.replace("page", "." + scope_cls, 1)
            elif one.startswith("."):
                one = "." + scope_cls + " " + one
            else:
                one = "." + scope_cls + " " + one
            scoped_sels.append(one)

        if not scoped_sels:
            i = j
            continue

        out.append("%s {%s}" % (", ".join(scoped_sels), body))
        i = j

    return "\n".join(out)
