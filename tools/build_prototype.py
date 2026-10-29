# -*- coding: utf-8 -*-
"""
构建离线原型：把每个页面的 WXML 用真实数据渲染成静态 HTML

产出：
  prototype/pages/<name>.html   每个页面的内容片段
  prototype/data/bundle.json    数据（已由 extract_prototype_data.py 生成）
"""
import io
import json
import os
import re
import sys

sys.path.insert(0, "tools")
import wxml_render_tree as wrt
from wxml_render_tree import render
from component_render import ComponentRenderer

PAGES_OUT = "prototype/pages"
WXSS_OUT = "prototype/css"
ASSETS_OUT = "prototype/assets"

CAT_NAMES = {"1": "证据搜集", "2": "维权途径", "3": "法条详解", "4": "维权专题"}
CAT_CLASS = {"1": "cat-blue", "2": "cat-green", "3": "cat-orange", "4": "cat-pink"}
DOC_TYPE_NAMES = {
    "civil_complaint": "民事起诉状",
    "report_letter": "举报文书",
    "negotiation_letter": "协商函",
}

# 页面清单（与 app.json 一致）
PAGES = [
    "index", "knowledge", "article", "document",
    "complaint-form", "complaint-detail",
    "report-form", "report-detail",
    "negotiation-form", "negotiation-detail",
    "agency", "profile", "my-documents",
    "search", "list", "document-article", "complaint-edit",
]


def build_ctx(page, bundle):
    """为每个页面准备上下文"""
    arts = bundle["articles"]
    docs = bundle["documents"]
    base = {
        # 与小程序 app.js 的算法一致：
        # navBarHeight = (menuTop - statusBarHeight) * 2 + menuHeight + statusBarHeight
        # 原型按 iPhone 375x812 取值
        "navBarHeight": 88,
        "statusBarHeight": 44,
        "contentHeight": 44,
        "menuHeight": 32,
        "isDarkMode": False,
        "isHarmony": False,
        "isSearchActive": False,
        "isSearchFocus": False,
        "keyword": "",
        "history": ["七天无理由退货", "货不对板", "虚假宣传", "起诉流程"],
        "showBackTop": False,
        "currentSwiperIndex": 0,
        "bannerHeight": 158,
        "scrollTop": 0,
    }

    banners = [
        {"id": 1, "image": "assets/banner-complaint.jpg"},
        {"id": 2, "image": "assets/banner-report.jpg"},
        {"id": 3, "image": "assets/banner-negotiation.jpg"},
    ]

    categories = [
        {"id": "1", "name": "证据搜集", "desc": "知道该拍什么，怎么拍才有效",
         "icon": "assets/ic-evidence.svg",
         "bgColor": "linear-gradient(135deg,#3b82f6,#2563eb)",
         "shadowColor": "rgba(37,99,235,.28)"},
        {"id": "2", "name": "维权途径", "desc": "协商、投诉、起诉怎么选",
         "icon": "assets/ic-channel.svg",
         "bgColor": "linear-gradient(135deg,#22c55e,#16a34a)",
         "shadowColor": "rgba(22,163,74,.28)"},
        {"id": "3", "name": "法条详解", "desc": "该引哪一条，为什么",
         "icon": "assets/ic-law.svg",
         "bgColor": "linear-gradient(135deg,#f97316,#ea580c)",
         "shadowColor": "rgba(234,88,12,.28)"},
        {"id": "4", "name": "维权专题", "desc": "从取证到结案的全流程",
         "icon": "assets/ic-topic.svg",
         "bgColor": "linear-gradient(135deg,#ec4899,#db2777)",
         "shadowColor": "rgba(219,39,119,.28)"},
    ]

    art_cards = [{
        "id": a["id"],
        "title": a["title"],
        "summary": a["desc"],
        "category": CAT_NAMES.get(a["category_l1"], "维权专题"),
        "date": a["date"],
        "image": a.get("image", ""),
        "views": a["view"],
        "collect": a["collect"],
    } for a in arts]

    base.update({
        "banners": banners,
        "categories": categories,
        "articles": art_cards[:6],
        "hotArticles": art_cards[:6],
        "allArticles": art_cards,
        "articleList": art_cards,
    })

    if page in ("article", "document-article"):
        a = arts[0]
        base["article"] = {
            "id": a["id"],
            "title": a["title"],
            "category": CAT_NAMES.get(a["category_l1"], ""),
            "categoryClass": CAT_CLASS.get(a["category_l1"], ""),
            "date": a["date"],
            "views": a["view"],
            "collect": a["collect"],
            "content": a["content"],
            "desc": a["desc"],
        }
        base["isCollected"] = False
        base["showBackTop"] = False

    if page == "knowledge":
        base["currentTab"] = "1"
        base["currentSubTab"] = "all"
        base["currentChildTab"] = "all"
        base["currentTabIndex"] = 0
        base["level1IndicatorColor"] = "#2563eb"
        base["level1IndicatorShadow"] = "rgba(37,99,235,.4)"
        base["sidebarIndicatorTop"] = 30
        base["level1Tabs"] = categories
        base["level2Items"] = [{"id": "all", "name": "全部"}]
        # 侧边栏用 subCategories[currentTab] 取二级分类
        base["subCategories"] = {
            "1": [
                {"id": "all", "name": "全部", "icon": "assets/ic-evidence.svg"},
                {"id": "1", "name": "一般证据", "icon": "assets/ic-evidence.svg"},
                {"id": "2", "name": "特殊证据", "icon": "assets/ic-evidence.svg"},
            ],
            "2": [
                {"id": "all", "name": "全部", "icon": "assets/ic-channel.svg"},
                {"id": "3", "name": "协商维权", "icon": "assets/ic-channel.svg"},
                {"id": "4", "name": "调解组织", "icon": "assets/ic-channel.svg"},
                {"id": "6", "name": "司法手段", "icon": "assets/ic-channel.svg"},
            ],
            "3": [
                {"id": "all", "name": "全部", "icon": "assets/ic-law.svg"},
                {"id": "7", "name": "民法典", "icon": "assets/ic-law.svg"},
                {"id": "8", "name": "消保法", "icon": "assets/ic-law.svg"},
                {"id": "10", "name": "平台规定", "icon": "assets/ic-law.svg"},
            ],
            "4": [
                {"id": "all", "name": "全部", "icon": "assets/ic-topic.svg"},
            ],
        }
        base["currentSubCategory"] = {"id": "all", "children": []}
        # 这些尺寸原本由 wx.createSelectorQuery().boundingClientRect() 测得
        # 原页面用 createSelectorQuery 测得的图标盒尺寸
        base["iconBoxSize"] = 40
        base["indicatorWidth"] = 70
        base["indicatorHeight"] = 26
        base["level1Name"] = "证据搜集"
        base["level1Desc"] = "知道该拍什么，怎么拍才有效"
        base["articles"] = art_cards

    if page == "my-documents":
        civ = [d for d in docs if d["type"] == "civil_complaint"]
        rep = [d for d in docs if d["type"] == "report_letter"]
        neg = [d for d in docs if d["type"] == "negotiation_letter"]
        mk = lambda ds: [{
            "id": d["id"], "title": d["title"],
            "status": d["status"] or "generated",
            "caseReason": "", "claimsSummary": "",
            "time": d["time"], "updatedAt": d["time"],
        } for d in ds]
        base.update({
            "currentTab": "civil_complaint",
            "isLoading": False,
            "civilComplaints": mk(civ),
            "reportLetters": mk(rep),
            "negotiationLetters": mk(neg),
            "civilCount": len(civ),
            "reportCount": len(rep),
            "negotiationCount": len(neg),
        })

    if page == "profile":
        base["userInfo"] = {"avatarUrl": "", "nickName": "言子仪"}
        base["hasUserInfo"] = True
        base["collectCount"] = 12
        base["documentCount"] = len(docs)
        base["historyCount"] = 8

    if page == "agency":
        base["expandedIndex"] = 0

    if page == "list":
        base["listType"] = "favorites"
        base["list"] = art_cards
        base["articles"] = art_cards
        base["title"] = "我的收藏"
        base["loading"] = False

    if page == "search":
        base["keyword"] = "退货"
        base["searchResults"] = art_cards[:6]
        base["results"] = art_cards[:6]
        base["currentSort"] = "comprehensive"
        base["loading"] = False
        base["totalCount"] = len(art_cards)

    # 表单页：补齐运行时计算出的尺寸变量
    # （原页面在 onLoad 里按设备信息计算，原型直接给合理常量）
    if page.endswith("-form"):
        base.update({
            "currentStep": 0,
            "headerHeight": 108,
            "totalHeaderHeight": 128,
            "paddingBottom": 34,
            "pageScrollDisabled": False,
            # 原型固定在第 1 步，避免模板里出现 '100vh' 字面量
            "isPreviewStep": False,
            "steps": [
                {"title": "当事人", "index": 0},
                {"title": "法院", "index": 1},
                {"title": "诉求", "index": 2},
                {"title": "事实", "index": 3},
                {"title": "预览", "index": 4},
            ],
            "formData": {},
            "scenarioOptions": [],
            "claimOptions": [],
            "causeOptions": [],
            "showEvidenceModal": False,
            "showDisclaimerModal": False,
            "showSignatureModal": False,
            "isPolished": False,
            "isGenerating": False,
            "generatedContent": "",
            "evidenceList": {},
        })

    if page == "complaint-edit":
        base["bodyText"] = chr(10).join([
            '事实与理由',
            '',
            '原告于 2026 年 1 月 18 日通过某电商平台购买了被告销售的「冬季加厚羊毛混纺大衣」一件，商品页面明确标注面料成分为羊毛 70%、聚酯纤维 30%，价格 899 元，订单号 202601180001。',
            '',
            '原告于 1 月 22 日收到商品后，经仔细查验发现：该大衣的实际手感粗糙板结，与页面宣传的羊毛质感明显不符；领口内侧水洗标标注的成分实为「聚酯纤维 100%」，与商品详情页描述存在实质性差异。原告已留存商品详情页截图、开箱视频及水洗标照片。',
            '',
            '原告于 1 月 23 日通过平台客服联系被告要求退货退款，被告以「商品已拆封影响二次销售」为由拒绝，此后未再回复。',
            '',
            '根据《中华人民共和国民法典》第五百七十七条、第五百八十二条及《中华人民共和国消费者权益保护法》第二十四条、第五十五条之规定，被告以虚假的商品描述误导原告作出购买决定，构成欺诈，应当承担退货退款及惩罚性赔偿责任。',
        ])

    return base


def fix_asset_paths(html):
    """
    小程序里 /images/xxx 是「小程序包根目录」的绝对路径。
    原型里没有这个概念，统一改成 assets/ 下的同名文件。
    图标已全量复制到 prototype/assets/，所以只需改前缀。
    """
    # 1) /images/icons/xxx.svg  ->  assets/xxx.svg
    html = re.sub(r'src="/?images/icons/([\w-]+)\.svg"',
                  r'src="assets/\1.svg"', html)
    # 2) /images/card-bg/xxx-bg.jpg -> assets/card-xxx.jpg
    html = re.sub(r'src="/?images/card-bg/([\w-]+?)-bg\.jpg"',
                  r'src="assets/card-\1.jpg"', html)
    # 3) 其他 /images/*.png|jpg|svg
    html = re.sub(r'src="/?images/([\w/-]+\.(?:png|jpg|jpeg|svg))"',
                  r'src="assets/\1"', html)
    # 4) 空 src 去掉
    html = re.sub(r'\ssrc=""', "", html)

    # 5) 内联样式里的 100vh：小程序是整屏，原型内容区已扣掉导航栏，
    #    直接用会撑出屏幕
    html = html.replace("100vh", "100%")

    # 6) 空单位兜底（如 "width: px"），清掉无效声明
    html = re.sub(r"(width|height|top|left|right|bottom|margin|padding)\s*:\s*px\s*;?",
                  "", html)
    html = re.sub(r"-\s*px\s*/\s*2", "- 0px/2", html)

    return html


def main():
    os.makedirs(PAGES_OUT, exist_ok=True)
    bundle = json.load(io.open("prototype/data/bundle.json", encoding="utf-8"))

    report = []
    comp_renderer = ComponentRenderer({})
    wrt.COMPONENT_HOOK = comp_renderer

    for page in PAGES:
        wxml_path = "miniprogram/pages/%s/%s.wxml" % (page, page)
        if not os.path.exists(wxml_path):
            report.append((page, None, "无 wxml"))
            continue
        src = io.open(wxml_path, encoding="utf-8").read()
        ctx = build_ctx(page, bundle)
        try:
            html = render(src, ctx)
        except Exception as e:
            report.append((page, None, "渲染异常: %s" % e))
            continue

        html = fix_asset_paths(html)

        out = os.path.join(PAGES_OUT, page + ".html")
        with io.open(out, "w", encoding="utf-8") as fh:
            fh.write(html)

        residual = html.count("{{")
        report.append((page, len(html), "残留 {{: %d" % residual if residual else "OK"))

    print("%-20s %8s  %s" % ("PAGE", "SIZE", "STATUS"))
    print("-" * 55)
    for p, size, st in report:
        print("%-20s %8s  %s" % (p, size if size else "-", st))

    # 输出 TabBar 片段（三个选中态各一份，供外壳选用）
    from component_render import tabbar_html
    os.makedirs("prototype/fragments", exist_ok=True)
    tb_css = ""
    for idx in (0, 1, 2):
        html_tb, css_tb = tabbar_html(idx, comp_renderer.base_ctx)
        with io.open("prototype/fragments/tabbar_%d.html" % idx, "w", encoding="utf-8") as fh:
            fh.write(html_tb)
        if css_tb:
            tb_css = css_tb
    if tb_css:
        with io.open("prototype/css/tabbar.css", "w", encoding="utf-8") as fh:
            fh.write(tb_css)
        print("TabBar 样式已输出")

    # TabBar 片段里的图标路径也要修（组件是单独渲染的，不经过页面级 fix_asset_paths）
    for idx in (0, 1, 2):
        fp = "prototype/fragments/tabbar_%d.html" % idx
        if os.path.exists(fp):
            frag = io.open(fp, encoding="utf-8").read()
            frag = fix_asset_paths(frag)
            with io.open(fp, "w", encoding="utf-8") as fh:
                fh.write(frag)

    # 输出被渲染到的组件样式
    css = comp_renderer.component_css()
    if css:
        with io.open("prototype/css/components.css", "w", encoding="utf-8") as fh:
            fh.write(css)
        print("\n组件样式已输出: prototype/css/components.css (%d 字符)" % len(css))
        print("已渲染组件:", ", ".join(sorted(comp_renderer.used)))


if __name__ == "__main__":
    main()
