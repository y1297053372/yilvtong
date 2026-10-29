# 衣律通 代码审查 — 第二轮跟进报告

> 基于第一轮审查报告的修复情况，对全部源文件进行二次审查

---

## ✅ 已修复项汇总（做得好！）

| # | 原问题 | 修复状态 |
|---|---|---|
| 1 | 知晓云 SDK 未使用（181KB 浪费） | ✅ 已删除 [sdk-wechat.3.23.6.js](file:///d:/yilvtong/miniprogram/sdk-wechat.3.23.6.js)，[app.js](file:///d:/yilvtong/miniprogram/app.js) 精简到 45 行 |
| 2 | `menuBotton` 拼写错误 | ✅ 修正为 `menuBottom` |
| 3 | [pdfUtils.js](file:///d:/yilvtong/miniprogram/utils/pdfUtils.js) 无效 try-catch | ✅ 已清理，代码精简 |
| 4 | [checkIdCard](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#171-177) 逻辑不一致 | ✅ 统一到 [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js) 支持 15+18 位 |
| 5 | AI 润色逻辑重复 | ✅ 提取到 [utils/aiService.js](file:///d:/yilvtong/miniprogram/utils/aiService.js) |
| 6 | `BaseFormPage` 缺少 [_buildDocumentPayload](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#167-195) | ✅ 重构完成，加入 hook（[getExtraDocumentData](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#196-199)、[getExtraDraftData](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#200-203)） |
| 7 | `BaseFormPage` 硬编码步骤索引 | ✅ 改为可配置 `finalInputStep` |
| 8 | `require` 在函数体内调用 | ✅ [search.js](file:///d:/yilvtong/miniprogram/pages/search/search.js) 和 [baseFormPage.js](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js) 已移到顶部 |
| 9 | `scrollBehavior` Behavior 创建 | ✅ 已创建 [behaviors/scrollBehavior.js](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js) |
| 10 | [userService.js](file:///d:/yilvtong/miniprogram/services/userService.js) 创建 | ✅ 已创建并在 [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 中使用 |
| 11 | [documentService.js](file:///d:/yilvtong/miniprogram/services/documentService.js) 创建 | ✅ 已创建并在 [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 中使用 |
| 12 | 日期函数集中化 | ✅ [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js) 统一定义 5 种日期格式函数 |
| 13 | `CLAIM_LABEL_MAP` 与 `CLAIM_OPTIONS` 不一致 | ✅ 已修正，现在完全一致 |
| 14 | 浏览量双重递增 | ✅ [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 的 [addToHistory](file:///d:/yilvtong/miniprogram/pages/article/article.js#404-426) 不再递增 [view](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#207-247) |
| 15 | `wx.onThemeChange` 监听器泄漏 | ✅ [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 和 [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) 都已添加 [onUnload](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#83-96) 清理 |
| 16 | API Key 硬编码 | ✅ `searchCourts` 改用 `process.env.MAP_KEY` |
| 17 | `globalArticleCache` 无失效机制 | ✅ 改用 [ArticleCache](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#6-43) 类，带 TTL(5min) + 最大容量(50) |
| 18 | [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 使用 Service 层 | ✅ 已改用 `userService` + `documentService` |

---

## 🟠 仍然存在的问题（待优化）

### 1. `scrollBehavior` 创建了但未被任何页面使用

[behaviors/scrollBehavior.js](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js) 已正确实现，但以下页面仍使用本地 [onPageScroll](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js#6-17) + [onBackToTop](file:///d:/yilvtong/miniprogram/pages/search/search.js#35-41)：

| 页面 | 行号 |
|---|---|
| [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js#L427-L444) | 427-444 |
| [search.js](file:///d:/yilvtong/miniprogram/pages/search/search.js#L23-L40) | 23-40 |
| [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js#L62-L82) | 62-82 |

> [!TIP]
> [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) 使用 `scroll-view` 组件因此需要特殊处理（[onScroll](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#183-195) 而非 [onPageScroll](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js#6-17)），无法直接使用 Behavior。但 [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 和 [search.js](file:///d:/yilvtong/miniprogram/pages/search/search.js) 完全可以使用。用法示例：
> ```js
> const scrollBehavior = require('../../behaviors/scrollBehavior');
> Page({
>   behaviors: [scrollBehavior],
>   // 不再需要 onPageScroll 和 onBackToTop
> })
> ```

---

### 2. [report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js) 和 [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 仍覆写了 BaseFormPage 中已有的方法

虽然已经 `...BaseFormPage`，但以下方法直接覆写了 `BaseFormPage` 中完全相同的实现：

| 覆写方法 | report-form | negotiation-form | BaseFormPage 中已有 |
|---|---|---|---|
| [onLoad()](file:///d:/yilvtong/miniprogram/pages/search/search.js#11-22) | [L76-85](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L76-L85) | [L81-92](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L81-L92) | ✅ 完全一致 |
| [onShow()](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#89-94) | [L89-93](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L89-L93) | — | ✅ 完全一致 |
| [nextStep()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#367-393) | [L341-366](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L341-L366) | — | ✅ 完全一致 |
| [exportPDF()](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#218-226) | [L496-529](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L496-L529) | [L584-612](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L584-L612) | ✅ 几乎一致（仅 title 不同） |

**建议**：删除这些覆写，让 `BaseFormPage` 的方法生效。[exportPDF](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#218-226) 中唯一的差异是 `title` 参数，但 `BaseFormPage.exportPDF()` 已经调用 `this.getPDFTitle()`，所以子页面只需实现 [getPDFTitle()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#454-457) 即可。

---

### 3. [loadDocumentData()](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#117-152) 仍在三个表单页中各自实现

| 文件 | 行号 | 行数 |
|---|---|---|
| [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L274-L316) | 274-316 | ~42 行 |
| [report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L95-L120) | 95-120 | ~25 行 |
| [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L117-L151) | 117-151 | ~34 行 |

三者的核心逻辑几乎相同（解析 draftData、设置 formData/currentStep/maxReachedStep/generatedText/documentId、清除 globalData.draftData）。

**建议**：将公共部分提到 `BaseFormPage.loadDocumentData()` 中，子页面只覆写差异部分（如 complaint-form 额外恢复 `scenarioOptions`/`scenarioQuestions`/`evidenceList`）：
```js
// BaseFormPage
loadDocumentData() {
  const draft = getApp().globalData.draftData;
  if (!draft || !draft.formData) return;

  const formData = JSON.parse(JSON.stringify(draft.formData));
  this.setData({
    formData,
    currentStep: draft.lastStep || 0,
    maxReachedStep: draft.lastStep || 0,
    ...(draft.generatedContent ? { generatedText: draft.generatedContent } : {}),
    ...(draft.documentId ? { documentId: draft.documentId } : {})
  });
  this.hasGenerated = draft.status === 'generated';
  getApp().globalData.draftData = null;

  this.onDraftLoaded(draft); // hook for subclass
},
onDraftLoaded(draft) {} // 子类覆写
```

---

### 4. [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 仍有本地 [formatDate](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379) 和 [formatTimeAgo](file:///d:/yilvtong/miniprogram/pages/article/article.js#364-382)

| 方法 | 行号 | documentUtils 中对应 |
|---|---|---|
| [formatDate(timestamp)](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379) | [article.js:526-533](file:///d:/yilvtong/miniprogram/pages/article/article.js#L526-L533) | [formatDateCN()](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-20) |
| [formatTimeAgo(timestamp)](file:///d:/yilvtong/miniprogram/pages/article/article.js#364-382) | [article.js:365-381](file:///d:/yilvtong/miniprogram/pages/article/article.js#L365-L381) | [formatRelativeTime()](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#41-60) |

**建议**：从 `documentUtils` 导入并使用。注意 [formatTimeAgo](file:///d:/yilvtong/miniprogram/pages/article/article.js#364-382) 接收的是毫秒时间戳而 [formatRelativeTime](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#41-60) 接收 [Date](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379) 对象，需要统一参数类型。

---

### 5. [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) 仍有本地 [formatDate](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379)

[knowledge.js:371-378](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L371-L378) 定义了与 `documentUtils.formatDateISO` 完全相同的函数。

**建议**：`const { formatDateISO } = require('../../utils/documentUtils');` 然后用 [formatDateISO](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#21-29) 替换。

---

### 6. [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 仍直接操作数据库而非使用 `userService`

以下操作可以直接使用已创建的 `userService`：

| 操作 | 当前代码 | 应替换为 |
|---|---|---|
| 检查收藏状态 | [L387-402](file:///d:/yilvtong/miniprogram/pages/article/article.js#L387-L402)（直接查 user 集合） | `userService.checkInFavorites(articleId)` |
| 添加浏览记录 | [L405-425](file:///d:/yilvtong/miniprogram/pages/article/article.js#L405-L425)（直接查+更新 user 集合） | `userService.addToHistory(articleId)` |
| 收藏/取消收藏 | [L446-512](file:///d:/yilvtong/miniprogram/pages/article/article.js#L446-L512)（直接查+更新 user + article 集合） | `userService.addToFavorites()` / [removeFromFavorites()](file:///d:/yilvtong/miniprogram/services/userService.js#51-56) |

当前 [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 中这些操作加起来有 ~80 行的直接数据库操作代码，如果使用 `userService` 可精简到约 15 行。

---

### 7. [list.js](file:///d:/yilvtong/miniprogram/pages/list/list.js) 的 [loadUserCollection](file:///d:/yilvtong/miniprogram/pages/list/list.js#78-117) 仍直接操作数据库

[list.js:78-116](file:///d:/yilvtong/miniprogram/pages/list/list.js#L78-L116) 直接查询 `user` 集合获取 `favorites`/`history`。

**建议**：使用 `userService.getUserFavorites()` 和 `userService.getUserHistory()`。

---

### 8. [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 仍直接操作数据库

[my-documents.js:46-105](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#L46-L105) 的 [fetchDocuments()](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#44-106) 和 [L309-343](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#L309-L343) 的 [deleteDocument()](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#308-344) 都直接操作 `documents` 集合。

**建议**：使用 `documentService.getDocuments()` 和 `documentService.deleteDocument()`。

---

### 9. [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 的 banner/articles `.map()` 仍然冗余

[index.js:130-147](file:///d:/yilvtong/miniprogram/pages/index/index.js#L130-L147)：`articleService.getBanners()` 返回的对象已经包含 `{ id, image, title, desc }` 字段，但代码又手动映射了一次完全相同的结构。`hotArticles` 同理。

```diff
- const bannerList = banners.map(item => ({
-   id: item.id, image: item.image, title: item.title, desc: item.desc
- }));
+ const bannerList = banners;
```

---

### 10. [articleService.js](file:///d:/yilvtong/miniprogram/services/articleService.js) 仍有自己的 [formatDate](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379)

[articleService.js:11-18](file:///d:/yilvtong/miniprogram/services/articleService.js#L11-L18) 定义的 [formatDate](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379) 与 `documentUtils.formatDateISO` 功能完全一致。

**建议**：`const { formatDateISO } = require('../utils/documentUtils');` 然后替换。

---

### 11. [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 的 [updateUserToCloud](file:///d:/yilvtong/miniprogram/pages/profile/profile.js#166-198) 绕过了 `userService`

[profile.js:166-197](file:///d:/yilvtong/miniprogram/pages/profile/profile.js#L166-L197) 虽然获取用户信息用了 `userService.getCurrentUser()`，但创建和更新用户仍然**直接操作数据库**。

**建议**：在 `userService` 中添加 `createUser(data)` 方法，然后 [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 统一走 Service 层。

---

### 12. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 生成日期未使用统一函数

[complaint-form.js:1145-1146](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1145-L1146)：
```js
text += `          ${today.getFullYear()} 年 ${today.getMonth()+1} 月 ${today.getDate()} 日`;
```

**建议**：使用 [formatDate(new Date())](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379)（来自 `documentUtils`）。

---

### 13. [complaint-detail.js](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js) 日期格式化也是手动拼接

[complaint-detail.js:25](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#L25)：
```js
const dateStr = `${today.getFullYear()} 年 ${today.getMonth()+1} 月 ${today.getDate()} 日`;
```

**建议**：`const { formatDate } = require('../../utils/documentUtils');` 然后 [formatDate(new Date())](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379)。

---

### 14. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 中 [onClaimChange](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#751-756) 和 [onClaimItemTap](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#272-287) 仍重复

[complaint-form.js:751-755](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L751-L755) 和 [L777-791](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L777-L791) 两个方法都处理选中诉求并调用 [checkFraudClaim](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#737-750)。如果模板中同时绑定了 `checkbox-group` 的 `bindchange` 和单项的 `bindtap`，会导致两个事件都触发。

**建议**：只保留 [onClaimItemTap](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#272-287)（手动切换方式），删除 [onClaimChange](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#751-756)。

---

### 15. [report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js) 和 [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 中 [onReady](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#87-88) 为空函数

[report-form.js:87](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L87) 和 [negotiation-form.js:94](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L94)：
```js
onReady() {},
```

无任何逻辑，应删除。

---

### 16. [report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js) 中 `data` 内 `headerHeight` 等字段重复定义

[report-form.js:21-23](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L21-L23) 重复定义了 `BaseFormPage.data` 中已有的字段：
```js
headerHeight: 88,
totalHeaderHeight: 120,
paddingBottom: 0,
```

[negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 同理（[L21-23](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L21-L23)）。这些值已在 `BaseFormPage.data` 中定义，属于冗余。

---

### 17. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 中 [buildAIPrompt](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1384-1388) / [updateFullTextWithAI](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#227-274) 成为无意义的包装

[complaint-form.js:1384-1387](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1384-L1387) 和 [L1378-1382](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1378-L1382)：

这两个方法只是对 `aiService` 函数的一行包装调用，在文件内部也没有被其他方法调用（[generateWithAI](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#282-311) 已直接使用 [buildComplaintAIPrompt](file:///d:/yilvtong/miniprogram/utils/aiService.js#1-54)）。[complaint-detail.js](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js) 中的 [buildAIPrompt](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1384-1388)（[L312-315](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#L312-L315)）同理。

**建议**：删除这些一行包装函数。

---

## 📋 改进优先级

| 优先级 | 项目 | 预估时间 |
|---|---|---|
| 🟠 中 | #2 删除 report-form/negotiation-form 中对 BaseFormPage 的无意义覆写 | 30 min |
| 🟠 中 | #3 将 [loadDocumentData](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#117-152) 公共逻辑提到 BaseFormPage | 1 hr |
| 🟠 中 | #6 [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 改用 `userService` | 30 min |
| 🟡 低 | #1 让 article.js/search.js 使用 `scrollBehavior` | 15 min |
| 🟡 低 | #4 #5 #10 #12 #13 统一消除剩余 [formatDate](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#371-379) 重复 | 30 min |
| 🟡 低 | #7 #8 [list.js](file:///d:/yilvtong/miniprogram/pages/list/list.js) + [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 改用 Service 层 | 45 min |
| 🟡 低 | #9 删除 [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 中冗余 `.map()` | 5 min |
| 🟡 低 | #11 [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 的 [updateUserToCloud](file:///d:/yilvtong/miniprogram/pages/profile/profile.js#166-198) 走 `userService` | 20 min |
| 🟡 低 | #14-17 删除重复函数定义、空函数、冗余数据声明 | 15 min |

---

## 总结

第一轮审查中的 **18 个已修复项** 覆盖了所有 P0（严重）问题——特别是知晓云 SDK 浪费、浏览量 bug、API Key 安全、`BaseFormPage` 重构和 AI 逻辑提取这几项关键修复做得非常好。

剩余的 **17 个待优化项** 全部属于 **P1/P2（中/低优先级）**，核心主题是：
1. **已创建的工具没有被全面采用**——`scrollBehavior`、`userService`、`documentService`、`documentUtils` 中的统一日期函数已经存在，但部分页面还没有迁移过来使用
2. **表单页的 BaseFormPage 方法覆写未完全清理**——[exportPDF](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#218-226)、[onLoad](file:///d:/yilvtong/miniprogram/pages/search/search.js#11-22)、[nextStep](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#367-393)、[loadDocumentData](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#117-152) 在子页面中仍有不必要的覆写
3. **少量冗余代码**——空函数、重复字段声明、一行包装函数等

整体代码质量已从第一轮的 **4/10** 提升到大约 **7/10**，架构设计和模块化程度显著改善。
