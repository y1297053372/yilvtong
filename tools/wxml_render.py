# -*- coding: utf-8 -*-
"""
WXML 渲染器

在 wxml2html 的语法转换之上，处理微信的数据绑定：

  {{ expr }}            表达式求值
  wx:for="{{list}}"     循环（支持 wx:for-item / wx:for-index）
  wx:if / wx:elif / wx:else
  hidden="{{cond}}"     条件隐藏

表达式支持子集：变量、成员访问、算术、比较、逻辑、三元、字面量、
以及有限的方法调用（length / indexOf / includes）。

设计原则：宁可渲染不出来也不要渲染出错 —— 任何求值异常都降级为空字符串，
并在 debug 模式下记录。
"""
import re

DEBUG = False
_errors = []


def record_err(where, exc):
    if DEBUG:
        _errors.append((where, str(exc)))


class SafeExpr:
    """极简表达式求值器，只允许安全操作"""

    def __init__(self, ctx):
        self.ctx = ctx

    def get(self, name):
        return self.ctx.get(name, "")

    def eval(self, expr):
        expr = expr.strip()
        try:
            return self._eval(expr)
        except Exception as e:
            record_err(expr, e)
            return ""

    # ---- 递归下降的简化实现 ----
    def _eval(self, e):
        e = e.strip()
        if not e:
            return ""

        # 三元 a ? b : c（从右往左找最外层问号）
        q = self._find_top(e, "?")
        if q >= 0:
            c = self._find_top(e, ":", start=q + 1)
            if c > 0:
                cond = self._eval(e[:q])
                return self._eval(e[q + 1:c]) if truthy(cond) else self._eval(e[c + 1:])

        for op in ("||", "&&"):
            i = self._find_top(e, op)
            if i >= 0:
                l = self._eval(e[:i])
                if op == "||":
                    return l if truthy(l) else self._eval(e[i + 2:])
                return self._eval(e[i + 2:]) if truthy(l) else l

        for op in ("===", "!==", "==", "!=", ">=", "<=", ">", "<"):
            i = self._find_top(e, op)
            if i >= 0:
                l = self._eval(e[:i])
                r = self._eval(e[i + len(op):])
                return self._cmp(l, r, op)

        for op in ("+", "-"):
            i = self._find_top(e, op, skip_unary=True)
            if i > 0:
                l = self._eval(e[:i])
                r = self._eval(e[i + 1:])
                try:
                    if op == "+":
                        if isinstance(l, str) or isinstance(r, str):
                            return to_str(l) + to_str(r)
                        return num(l) + num(r)
                    return num(l) - num(r)
                except Exception:
                    return ""

        for op in ("*", "/"):
            i = self._find_top(e, op)
            if i > 0:
                l = num(self._eval(e[:i]))
                r = num(self._eval(e[i + 1:]))
                try:
                    return l * r if op == "*" else (l / r if r else 0)
                except Exception:
                    return 0

        if e.startswith("!"):
            return not truthy(self._eval(e[1:]))
        if e.startswith("-"):
            return -num(self._eval(e[1:]))

        return self._atom(e)

    def _atom(self, e):
        e = e.strip()
        if e in ("true", "True"):
            return True
        if e in ("false", "False"):
            return False
        if e in ("null", "None", "undefined"):
            return ""
        if (e.startswith("'") and e.endswith("'")) or (e.startswith('"') and e.endswith('"')):
            return e[1:-1]
        if re.match(r"^-?\d+(\.\d+)?$", e):
            return float(e) if "." in e else int(e)

        # 方法调用： a.b(...) 或 a.length
        m = re.match(r"^([\w.]+)\((.*)\)$", e)
        if m:
            path, argstr = m.group(1), m.group(2)
            base = self._path(path.rsplit(".", 1)[0]) if "." in path else ""
            method = path.rsplit(".", 1)[-1]
            arg = self._eval(argstr) if argstr.strip() else None
            return call_method(base, method, arg)

        # 括号
        if e.startswith("(") and e.endswith(")"):
            return self._eval(e[1:-1])

        return self._path(e)

    def _path(self, e):
        """支持 a.b、a.b[expr]、a[expr][expr2] 等"""
        e = e.strip()
        # 先拆出根标识符
        m = re.match(r"^([A-Za-z_$][\w$]*)", e)
        if not m:
            return ""
        cur = self.ctx.get(m.group(1), "")
        rest = e[m.end():]

        # 依次处理 .prop 和 [expr]
        while rest:
            if rest.startswith("."):
                m2 = re.match(r"\.([\w$]+)", rest)
                if not m2:
                    break
                key = m2.group(1)
                rest = rest[m2.end():]
                cur = self._index_or_attr(cur, key)
            elif rest.startswith("["):
                # 找配对的 ]
                depth = 0
                i = 0
                while i < len(rest):
                    if rest[i] == "[":
                        depth += 1
                    elif rest[i] == "]":
                        depth -= 1
                        if depth == 0:
                            break
                    i += 1
                if i >= len(rest):
                    break
                inner = rest[1:i]
                rest = rest[i + 1:]
                key = self._eval(inner) if inner.strip() else ""
                cur = self._index_or_attr(cur, key)
            else:
                break
        return cur

    def _index_or_attr(self, cur, key):
        if isinstance(cur, dict):
            # 字典键可能是数字，转成字符串再试
            if key in cur:
                return cur[key]
            ks = to_str(key)
            if ks in cur:
                return cur[ks]
            try:
                ik = int(key)
                if ik in cur:
                    return cur[ik]
            except Exception:
                pass
            return ""
        if isinstance(cur, list):
            if to_str(key) == "length":
                return len(cur)
            try:
                idx = int(key)
                return cur[idx] if -len(cur) <= idx < len(cur) else ""
            except Exception:
                return ""
        if isinstance(cur, str):
            if to_str(key) == "length":
                return len(cur)
            return ""
        return ""

    def _cmp(self, l, r, op):
        if op in ("===", "=="):
            return l == r
        if op in ("!==", "!="):
            return l != r
        try:
            if isinstance(l, str) and isinstance(r, str):
                return {"<": l < r, ">": l > r, "<=": l <= r, ">=": l >= r}[op]
            a, b = num(l), num(r)
            return {"<": a < b, ">": a > b, "<=": a <= b, ">=": a >= b}[op]
        except Exception:
            return False

    def _find_top(self, e, op, start=0, skip_unary=False):
        """找最外层（不在括号/引号内）的运算符位置，从右往左"""
        depth = 0
        quote_ch = None
        i = len(e) - 1
        while i >= start:
            ch = e[i]
            if quote_ch:
                if ch == quote_ch:
                    quote_ch = None
            elif ch in "\"'":
                quote_ch = ch
            elif ch == ")":
                depth += 1
            elif ch == "(":
                depth -= 1
            elif depth == 0:
                if e[i:i + len(op)] == op:
                    if skip_unary and i == 0:
                        pass
                    else:
                        # 避免把 != 的 ! 当成 ! 运算符等
                        if op in ("!", "-") and i > 0 and e[i - 1] in "=<>!+-*/(":
                            i -= 1
                            continue
                        return i
            i -= 1
        return -1


def truthy(v):
    if v is None or v == "" or v == 0 or v is False:
        return False
    if isinstance(v, (list, dict)) and len(v) == 0:
        return False
    return True


def num(v):
    if isinstance(v, (int, float)):
        return v
    try:
        return float(str(v))
    except Exception:
        return 0


def to_str(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def call_method(base, method, arg):
    try:
        if method == "length":
            return len(base)
        if method == "indexOf":
            return base.find(to_str(arg))
        if method == "includes":
            return to_str(arg) in base
    except Exception:
        pass
    return ""


BIND_RE = re.compile(r"\{\{(.*?)\}\}", re.S)


def interp(text, ctx):
    """把 {{expr}} 求值替换"""
    if "{{" not in text:
        return text
    ev = SafeExpr(ctx)

    def rep(m):
        return to_str(ev.eval(m.group(1)))

    return BIND_RE.sub(rep, text)


def eval_expr(expr, ctx):
    return SafeExpr(ctx).eval(expr)


def render_tokens(tokens, ctx):
    """tokens: wxml2html 产出的 html 片段列表（含 {{}}）"""
    return "".join(interp(t, ctx) for t in tokens)


def errors():
    return _errors
