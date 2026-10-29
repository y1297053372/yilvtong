# 修复验证与二次审查报告

> 审查日期：2026-03-03

---

## 一、修复验证结果

所有 14 处修复均**正确且有效** ✅

| # | 原始问题 | 修复方式 | 验证结果 |
|---|---------|---------|---------|
| 1 | [documentService.js](file:///d:/yilvtong/miniprogram/services/documentService.js) 链式 `.where()` 覆盖 | 改为构建单一 `conditions` 对象，一次性 `.where(conditions)` | ✅ 正确，[countDocuments](file:///d:/yilvtong/miniprogram/services/documentService.js#82-99) 也同步修复 |
| 2 | [aiService.js](file:///d:/yilvtong/miniprogram/utils/aiService.js) [cleanAIText](file:///d:/yilvtong/miniprogram/utils/aiService.js#83-112) 冗余正则 | 简化为单次 `search` + `substring`，删除冗余内层判断 | ✅ 正确，逻辑清晰 |
| 3 | [userService.js](file:///d:/yilvtong/miniprogram/services/userService.js) 无缓存致 N+1 查询 | 新增 `_userCache` + `_cacheTTL(5min)` + [invalidateCache()](file:///d:/yilvtong/miniprogram/services/userService.js#15-19)，写操作时失效 | ✅ 正确，[updateCurrentUser](file:///d:/yilvtong/miniprogram/services/userService.js#83-88) 传 `useCache:false` 避免脏读 |
| 4 | [constants.js](file:///d:/yilvtong/miniprogram/config/constants.js) `CLAIM_LABEL_MAP` 冗余 | 改为 `Object.fromEntries(CLAIM_OPTIONS.map(...))` 动态生成 | ✅ 正确 |
| 5 | [constants.js](file:///d:/yilvtong/miniprogram/config/constants.js) — 缺少起诉状和案由的集中映射 | 新增 `COMPLAINT_CLAIM_LABEL_MAP` + `CAUSE_LABEL_MAP` | ✅ 正确，消除了 [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 中的局部重复 |
| 6 | [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 正则推导 countName 脆弱 | 改为显式 `countNameMap` 对象映射 | ✅ 正确，安全可靠 |
| 7 | [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) [onShow](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#83-91) 无条件刷新 | 增加 `REFRESH_INTERVAL(30s)` + `_lastFetchTime` 节流 | ✅ 正确 |
| 8 | [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 局部重复 `causeOptionsMap`/`claimOptionsMap` | 改为从 [constants.js](file:///d:/yilvtong/miniprogram/config/constants.js) 导入集中映射 | ✅ 正确 |
| 9 | [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) [onShow](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#83-91) 无条件请求 | 增加 `REFRESH_INTERVAL(30s)` + `needRefreshProfile` 条件刷新 | ✅ 正确 |
| 10 | [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) [setDefaultDeadlineDate](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#92-98) 不一致 | 改为使用 [calculateFinalDate(10)](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#164-179) | ✅ 正确，与 [handleInput](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#151-180) 逻辑统一 |
| 11 | [baseFormPage.js](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js) [onHide](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#82-85)/[onUnload](file:///d:/yilvtong/miniprogram/pages/article/article.js#82-87) 重复保存 | 新增 [_debouncedSave()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#100-112) 带 `_isSaving` 锁 + 1 秒节流 | ✅ 正确 |
| 12 | `report-detail`/`negotiation-detail` 高度重复 | 新建 [baseDetailPage.js](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js)，两个详情页改为 `...BaseDetailPage` + 覆盖差异方法 | ✅ 正确，架构清晰 |
| 13 | [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) 直接查数据库未复用 service | 改为调用 `articleService.getArticlesByCategory()` | ✅ 正确，`articleService` 新增了该方法 |
| 14 | [articleService.js](file:///d:/yilvtong/miniprogram/services/articleService.js) 新增 [getArticlesByCategory()](file:///d:/yilvtong/miniprogram/services/articleService.js#339-387) | 单一 `.where(conditions)` + `.limit(100)` + `_.elemMatch` 处理 L3 数组字段 | ✅ 正确 |

---

## 二、仍可优化的地方

### 🟡 1. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) — [generateText()](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#309-393) 内部局部 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26) 仍遮蔽外部导入

文件顶部 L3 导入了 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26)，但 [generateText()](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#309-393) 内部（约 L969）定义了一个不同的局部函数 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26)，而其他地方则用 [safeFormatDate](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#840-853)（约 L840）。三个日期格式化函数并存，容易混淆：

- [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26)（导入，有数字补零）
- [safeFormatDate](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#840-853)（局部，无补零，容错强）
- 局部 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26)（L969，行为同 [safeFormatDate](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#840-853)）

> **建议**：删除 L969 处的局部 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26)，统一使用 [safeFormatDate](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#840-853) 或导入的 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26)。

---

### 🟡 2. [negotiation-detail.js](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js) — [copyText](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#171-185) 和 [exportPDF](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#186-207) 未复用基类

[negotiation-detail.js L53-82](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#L53-L82)

[copyText()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#171-185) 和 [exportPDF()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#186-207) 中手动拼接了 `this.data.mainContent + '...'`，其实 `BaseDetailPage` 已提供了 [getFullContent()](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#29-32) + [copyText()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#171-185) + [exportPDF()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#186-207)。子类已覆盖了 [getFullContent()](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#29-32)，所以基类的 [copyText()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#171-185) 和 [exportPDF()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#186-207) 已经能正确工作。

> **建议**：删除 [negotiation-detail.js](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js) 中的 [copyText()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#171-185) 和 [exportPDF()](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#186-207) 覆盖，直接使用基类方法。

---

### 🟡 3. [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 和 [document-article.js](file:///d:/yilvtong/miniprogram/pages/document-article/document-article.js) — 深色模式 tagStyle 主题处理逻辑重复

两个页面各自维护 [updateTagStyle(isDark)](file:///d:/yilvtong/miniprogram/pages/document-article/document-article.js#64-94) / [_themeHandler](file:///d:/yilvtong/miniprogram/pages/document-article/document-article.js#52-55) 的逻辑（[article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) L44-76, [document-article.js](file:///d:/yilvtong/miniprogram/pages/document-article/document-article.js) L64-93）。虽然两者的 tagStyle 属性不完全相同，但核心模式（颜色变量映射 + `setData`）完全一致。

> **建议**：在 [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js) 中提供一个 `getTagStyle(isDark, preset)` 工具函数，预设 `'article'` 和 `'document-article'` 两套配色方案，减少各页面的样式代码。

---

### 🟡 4. [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) — 仍手动实现 [onPageScroll](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js#6-17) + [onBackToTop](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#198-203)

[index.js L63-81](file:///d:/yilvtong/miniprogram/pages/index/index.js#L63-L81)

`scrollBehavior` behavior 已存在且被 [search.js](file:///d:/yilvtong/miniprogram/pages/search/search.js)、[article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 使用。[index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 仍手动实现了相同功能，唯一区别是使用了 300 的滚动阈值而非 `scrollBehavior` 默认的 200。

> **建议**：
> - 方案 A：让 `scrollBehavior` 接受 `scrollThreshold` 参数（通过 `definitionFilter` 或 data 覆盖），使 [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 也能使用它
> - 方案 B：如果 [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 是使用页面原生 [onPageScroll](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js#6-17) 而非 `scroll-view` 的 `bindscroll`，则保持现状（两者机制不同）

---

### 💡 5. [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) — 导入了 [formatDateISO](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#27-35) 但不再使用

[knowledge.js L2](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L2)

重构后 [loadArticles()](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#260-337) 改用 `articleService.getArticlesByCategory()` 返回已格式化的数据，[formatDateISO](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#27-35) 不再在本文件中调用。

> **建议**：删除 `const { formatDateISO } = require('../../utils/documentUtils');`

---

### 💡 6. [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) — 导入了 `DEFAULT_IMAGES` 但不再使用

[knowledge.js L1](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L1)

同样，`DEFAULT_IMAGES` 之前用于文章卡片的默认图片，现在由 `articleService` 内部处理。

> **建议**：改为 `const { CATEGORY_MAP } = require('../../config/constants');`

---

### 💡 7. [baseDetailPage.js](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js) — [onEditorReady](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#181-192) 中 `wx.createSelectorQuery().in(this)` 的 `this` 问题

[baseDetailPage.js L116](file:///d:/yilvtong/miniprogram/utils/baseDetailPage.js#L116)

`BaseDetailPage` 是一个普通对象被 spread 展开到 [Page({...})](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js#6-17) 中，[onEditorReady](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#181-192) 中 `wx.createSelectorQuery().in(this)` 的 `this` 指向 Page 实例，这在当前使用方式下是正确的。但需注意如果将来改为 Component 方式则需要调整。目前没有问题，仅作记录。

---

## 三、总结

| 状态 | 数量 |
|------|------|
| ✅ 原始问题已正确修复 | **14 / 14** |
| 🟡 仍可优化 | **4 处** |
| 💡 低优先级建议 | **3 处** |

代码质量已显著提升。推荐优先处理 **#1**（[formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-26) 遮蔽）和 **#2**（[negotiation-detail.js](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js) 冗余覆盖），这两个修改简单且风险低。
