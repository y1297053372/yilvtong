# -*- coding: utf-8 -*-
"""在真实页面上试渲染，检查转换质量"""
import io
import json
import sys

sys.path.insert(0, "tools")
from wxml_render_tree import render

# 构造一个接近真实 data 的上下文
bundle = json.load(io.open("prototype/data/bundle.json", encoding="utf-8"))
arts = bundle["articles"]

ctx = {
    "navBarHeight": 64,
    "isDarkMode": False,
    "isHarmony": False,
    "isSearchActive": False,
    "isSearchFocus": False,
    "keyword": "",
    "history": [],
    "showBackTop": False,
    "currentSwiperIndex": 0,
    "bannerHeight": 150,
    "banners": [
        {"id": 1, "image": "assets/banner-complaint.jpg"},
        {"id": 2, "image": "assets/banner-report.jpg"},
    ],
    "categories": [
        {"id": "1", "name": "证据搜集", "desc": "知道该拍什么", "icon": "assets/ic-evidence.svg",
         "bgColor": "linear-gradient(135deg,#3b82f6,#2563eb)", "shadowColor": "rgba(37,99,235,.3)"},
        {"id": "2", "name": "维权途径", "desc": "找对门路", "icon": "assets/ic-channel.svg",
         "bgColor": "linear-gradient(135deg,#22c55e,#16a34a)", "shadowColor": "rgba(22,163,74,.3)"},
        {"id": "3", "name": "法条详解", "desc": "引对条款", "icon": "assets/ic-law.svg",
         "bgColor": "linear-gradient(135deg,#f97316,#ea580c)", "shadowColor": "rgba(234,88,12,.3)"},
        {"id": "4", "name": "维权专题", "desc": "看懂全流程", "icon": "assets/ic-topic.svg",
         "bgColor": "linear-gradient(135deg,#ec4899,#db2777)", "shadowColor": "rgba(219,39,119,.3)"},
    ],
    "articles": [
        {"id": a["id"], "title": a["title"], "summary": a["desc"],
         "category": {"1": "证据搜集", "2": "维权途径", "3": "法条详解", "4": "维权专题"}.get(a["category_l1"], ""),
         "date": a["date"], "image": ""}
        for a in arts[:4]
    ],
}


def try_page(name):
    path = "miniprogram/pages/%s/%s.wxml" % (name, name)
    try:
        src = io.open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print("跳过（无 wxml）:", name)
        return
    html = render(src, ctx)
    print("=" * 70)
    print("%-20s 源 %5d 字符 → 渲染 %6d 字符" % (name, len(src), len(html)))
    # 检查残留
    residual = html.count("{{")
    print("   残留 {{ :", residual)
    if residual:
        idx = html.find("{{")
        print("   首个残留:", html[max(0, idx - 40):idx + 60].replace("\n", " "))
    print("   片段:", " ".join(html.split())[:200])


for p in ["index", "knowledge", "document", "article", "profile", "agency", "my-documents"]:
    try_page(p)
