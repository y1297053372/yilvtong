# 衣律通 微信小程序 — 全面代码审查报告

> **审查范围**：项目全部前端页面 (20 pages)、3 个自定义组件、Service 层、工具类 (3)、配置、自定义 TabBar、5 个云函数
> **文件总量**：约 7,000+ 行 JS 代码

---

## 总体评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| **架构设计** | 5 | 有 `BaseFormPage` 和 [ArticleService](file:///d:/yilvtong/miniprogram/services/articleService.js#20-347) 的模块化尝试，但未彻底贯彻 |
| **代码复用** | 3 | 最严重的技术债——大量逻辑在三个表单页中完整复制粘贴 |
| **安全性** | 5 | 评论有内容安全检测，但 API Key 硬编码、表单缺 XSS 防护 |
| **可维护性** | 4 | [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 1620行，充斥大量长 switch-case |
| **错误处理** | 6 | 有 try-catch 和降级逻辑，但风格不统一（回调/Promise 混用）|
| **性能** | 5 | 存在内存泄漏风险和无效的缓存策略 |
| **样式/设计系统** | 8 | CSS 变量体系完善，浅/深色主题切换无缝 |

---

## 🔴 严重问题 (P0)

### 1. 三个表单页面之间的巨量代码复制

这是项目中**最严重**的技术债。以下方法在 [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js)、[report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js)、[negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 中被完整复制粘贴：

| 重复方法 | 每个文件中行数 | 重复次数 |
|---|---|---|
| [saveDocumentToCloud()](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1512-1570) | ~30 行 | 3 |
| [doSaveDraftToCloud()](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#616-643) | ~25 行 | 3 |
| [exportPDF()](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1345-1375) | ~25 行 | 3 |
| [loadDocumentData()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#469-472) | ~25 行 | 3 |
| [onLoad()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#58-68) / [measureHeader()](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#240-257) | ~10 行 | 3 |
| [viewFullDocument()](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#558-583) | ~30 行 | 2 |

> [!CAUTION]
> 虽然已有 `BaseFormPage` 抽取公共逻辑，但 [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 完全覆写了 `BaseFormPage` 中已有的 [saveDocumentToCloud](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1512-1570)、[doSaveDraftToCloud](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#616-643)、[exportPDF](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1345-1375) 方法，report-form 和 negotiation-form 也各自独立实现了这些方法。这使得 `BaseFormPage` 的抽象形同虚设——修改一处需要同步三个文件。

**建议**：让子页只覆写差异部分（如增加 `evidenceList` 字段），公共的云存储/草稿/PDF 逻辑通过参数注入或 hook 方式保留在 `BaseFormPage` 中。

---

### 2. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 中 [saveDocumentToCloud](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1512-1570) 与 [doSaveDraftToCloud](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#616-643) 几乎完全相同

[complaint-form.js:1512-1569](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1512-L1569) 和 [complaint-form.js:1571-1620](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1571-L1620) 这两个方法内部的 evidence 收集逻辑（~30行）被完全复制了一遍，唯一区别是一个创建/更新文档，一个只更新草稿。

**建议**：提取 `_buildDocumentPayload()` 方法统一构建数据对象。

---

### 3. AI Prompt 和 [updateFullTextWithAI](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1423-1443) 在两个文件中完整重复

同样的 AI 润色逻辑被完整复制到两个文件：

| 方法 | 位置 1 | 位置 2 |
|---|---|---|
| [buildAIPrompt()](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#343-386) | [complaint-form.js:1444](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1444) | [complaint-detail.js:343](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#L343) |
| [generateWithAI()](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1376-1422) | [complaint-form.js:1376](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1376) | [complaint-detail.js:288](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#L288) |
| [updateFullTextWithAI()](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1423-1443) | [complaint-form.js:1423](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1423) | [complaint-detail.js:226](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#L226) |

**建议**：提取到 `utils/aiService.js`。

---

### 4. 浏览量双重递增 Bug

每次打开文章，浏览量会 +2，因为两处同时执行 `view: _.inc(1)`：
- [article.js:405-408](file:///d:/yilvtong/miniprogram/pages/article/article.js#L405-L408) → [addToHistory()](file:///d:/yilvtong/miniprogram/pages/article/article.js#399-429) 中
- [articleService.js:320-324](file:///d:/yilvtong/miniprogram/services/articleService.js#L320-L324) → [getArticleById()](file:///d:/yilvtong/miniprogram/services/articleService.js#318-346) 中

**修复**：删除 [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 中 [addToHistory](file:///d:/yilvtong/miniprogram/pages/article/article.js#399-429) 里的 `view: _.inc(1)`，仅保留 `articleService.getArticleById()` 中的。

---

### 5. 腾讯地图 API Key 硬编码

[searchCourts/index.js:11](file:///d:/yilvtong/cloudfunctions/searchCourts/index.js#L11)：
```js
const MAP_KEY = '6HABZ-JBSWL-EDFPR-M3SXS-3UWYO-LLBJ6';
```

> [!WARNING]
> 应使用云函数环境变量 `process.env.MAP_KEY`。

---

## 🟠 中度问题 (P1)

### 6. `wx.onThemeChange` 事件监听泄漏

以下两个页面在 [onLoad](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#58-68) 中注册了 `wx.onThemeChange` 监听器，但**从未在 [onUnload](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#79-92) 中移除**：
- [article.js:64](file:///d:/yilvtong/miniprogram/pages/article/article.js#L64)
- [knowledge.js:120](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L120)

每次进入页面都会叠加一个新的监听器，多次进出后会出现性能问题。

**修复**：
```js
onLoad() {
  this._themeHandler = (res) => { ... };
  wx.onThemeChange(this._themeHandler);
},
onUnload() {
  wx.offThemeChange(this._themeHandler);
}
```

---

### 7. 未使用的知晓云 SDK — 包体积浪费 181KB

[app.js:1](file:///d:/yilvtong/miniprogram/app.js#L1) 引入了 [sdk-wechat.3.23.6.js](file:///d:/yilvtong/miniprogram/sdk-wechat.3.23.6.js) (181KB)，并在 [onLaunch](file:///d:/yilvtong/miniprogram/app.js#13-58) 中初始化了知晓云，但整个项目所有业务逻辑都使用 `wx.cloud`，知晓云零引用。

**修复**：删除 [sdk-wechat.3.23.6.js](file:///d:/yilvtong/miniprogram/sdk-wechat.3.23.6.js) 文件，删除 [app.js](file:///d:/yilvtong/miniprogram/app.js) 中知晓云相关代码（第 1、15-20 行）。

---

### 8. [formatDate](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#335-343) 重复定义 5+ 次

| 文件 | 格式 | 行号 |
|---|---|---|
| [articleService.js](file:///d:/yilvtong/miniprogram/services/articleService.js#L11) | `YYYY-MM-DD` | 11 |
| [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#L3) | `YYYY 年 M 月 D 日` | 3 |
| [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#L23) | `YYYY-MM-DD`（[formatDateISO](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#23-31)） | 23 |
| [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js#L529) | `YYYY年M月D日` | 529 |
| [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L335) | `YYYY-MM-DD` | 335 |
| [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L947) | `YYYY年MM月DD日`（[safeFormatDate](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#947-960)） | 947 |

[formatRelativeTime](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#147-166) / [formatTimeAgo](file:///d:/yilvtong/miniprogram/pages/article/article.js#359-377) 也在 [article.js:360](file:///d:/yilvtong/miniprogram/pages/article/article.js#L360) 和 [documentUtils.js:147](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#L147) 中重复。

**建议**：统一在 [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js) 中定义所有日期函数，各文件统一导入。

---

### 9. 页面直接操作数据库 — 架构不统一

目前只有 `article` 集合通过 [ArticleService](file:///d:/yilvtong/miniprogram/services/articleService.js#20-347) 抽象，以下操作散落在多个页面中：

| 集合 | 直接操作的页面 |
|---|---|
| `user` | profile.js, article.js, list.js |
| `documents` | complaint-form.js, report-form.js, negotiation-form.js, my-documents.js, complaint-detail.js, baseFormPage.js |
| `comments` | article.js（但通过云函数 commentAction 间接操作） |
| `article` | knowledge.js（未使用 articleService） |

**建议**：创建 `userService.js` 和 `documentService.js`。特别是 [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) 应该直接使用 `articleService.getArticles()`，而不是自己写一套查询和数据映射。

---

### 10. [onPageScroll](file:///d:/yilvtong/miniprogram/pages/index/index.js#62-77) + [onBackToTop](file:///d:/yilvtong/miniprogram/pages/article/article.js#442-448) 在 4+ 个页面完全相同

- [index.js:62-82](file:///d:/yilvtong/miniprogram/pages/index/index.js#L62-L82)
- [article.js:430-447](file:///d:/yilvtong/miniprogram/pages/article/article.js#L430-L447)
- [search.js:21-38](file:///d:/yilvtong/miniprogram/pages/search/search.js#L21-L38)
- [knowledge.js:142-159](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L142-L159)

**建议**：抽取为 `Behavior`（小程序 mixin 机制）。

---

### 11. [checkIdCard](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#641-646) 重复且逻辑不一致

| 位置 | 支持格式 |
|---|---|
| [complaint-form.js:641](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L641) | 15位 + 18位 |
| [documentUtils.js:142](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#L142) | 仅18位 |

[negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 从 `documentUtils` 导入 [checkIdCard](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#641-646)，因此只校验 18 位，而 [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 使用自己内部的版本支持 15/18 位。同一个应用对同一类输入有不同的校验规则，这是隐性 bug。

---

### 12. 回调与 Promise 风格混用

- [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js)：全面使用传统 `success/fail` 回调
- [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js)：[loadArticle](file:///d:/yilvtong/miniprogram/pages/article/article.js#552-619) 用回调，[loadComments](file:///d:/yilvtong/miniprogram/pages/article/article.js#82-136) 用 `.then()`
- [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js)：[loadArticles](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#217-334) 用 `success/fail` 回调
- [articleService.js](file:///d:/yilvtong/miniprogram/services/articleService.js)：全面使用 `async/await`

**建议**：统一为 `async/await`。

---

### 13. `globalArticleCache` 永不失效

[knowledge.js:3](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L3)：
```js
const globalArticleCache = {};
```

这个模块级变量随运行时间无限增长且永不清除。如果文章被更新，用户看到的仍是旧数据。

**建议**：
1. 加入最大缓存条目数量限制
2. 加入 TTL（如 5 分钟过期）
3. 或者在 [onShow](file:///d:/yilvtong/miniprogram/pages/list/list.js#26-32) 时清除缓存

---

## 🟡 轻度问题 (P2)

### 14. [pdfUtils.js](file:///d:/yilvtong/miniprogram/utils/pdfUtils.js) 中的无效 try-catch

[pdfUtils.js:8-21](file:///d:/yilvtong/miniprogram/utils/pdfUtils.js#L8-L21)：
```js
try {
  // ...
} catch (err) {
  throw err;  // 捕获后直接重新抛出，毫无意义
}
```

### 15. `require` 在函数体内调用

| 位置 | 文件 |
|---|---|
| [search.js:64](file:///d:/yilvtong/miniprogram/pages/search/search.js#L64) | `require('../../services/articleService')` 在 [performSearch](file:///d:/yilvtong/miniprogram/pages/search/search.js#48-88) 内部 |
| [baseFormPage.js:282](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#L282) | `require('../../utils/pdfUtils')` 在 [exportPDF](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1345-1375) 内部 |
| [complaint-form.js:1346](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1346) | `require('../../utils/pdfUtils')` 在 [exportPDF](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1345-1375) 内部 |
| [report-form.js:507](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L507) | `require('../../utils/pdfUtils')` 在 [exportPDF](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1345-1375) 内部 |
| [negotiation-form.js:590](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L590) | `require('../../utils/pdfUtils')` 在 [exportPDF](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#1345-1375) 内部 |

应在文件头部统一 `require`。

### 16. [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 中 banner/articles 数据映射完全多余

[index.js:130-151](file:///d:/yilvtong/miniprogram/pages/index/index.js#L130-L151)：`articleService.getBanners()` 返回的 `{ id, image, title, desc }` 又被手动映射成完全相同结构的 `{ id, image, title, desc }`。这两步 `.map()` 是纯冗余的。

### 17. [performSearch](file:///d:/yilvtong/miniprogram/pages/search/search.js#48-88) 函数签名声明了参数但不使用

[search.js:17](file:///d:/yilvtong/miniprogram/pages/search/search.js#L17)：`this.performSearch(keyword)` 传入参数，但 [search.js:48](file:///d:/yilvtong/miniprogram/pages/search/search.js#L48) 方法内总是从 `this.data.keyword` 取值。

### 18. `globalData.menuBotton` — 拼写错误

[app.js:34](file:///d:/yilvtong/miniprogram/app.js#L34)：`menuBotton` → 应为 `menuBottom`。`index.js:36` 也引用了这个拼写错误。

### 19. [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 使用 `setTimeout(300ms)` 解决竞态条件

[my-documents.js:49](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#L49)：
```js
setTimeout(() => {
  db.collection('documents')...
}, 300);
```

这里用定时器"解决"竞态问题是不可靠的做法。应该通过 Promise 链或事件机制确保数据已写入。

### 20. 未清理的 PDF 文件

[generateDocumentPDF](file:///d:/yilvtong/cloudfunctions/generateDocumentPDF/index.js) 将生成的 PDF 上传到 `exports/` 路径后**无清理策略**，长期积累会增加存储成本。

### 21. 空目录和废弃文件

| 路径 | 问题 |
|---|---|
| `pages/document-detail/` | 空目录，未在 [app.json](file:///d:/yilvtong/miniprogram/app.json) 注册 |
| `pages/user/` | 空目录 |
| `pages/user-list/` | 空目录 |
| `cloudfunctions/initLegalDocuments/` | 空目录 |
| `yilvtong备份/` | 完整备份文件夹（427 个子项），不应纳入版本管理 |

### 22. `BaseFormPage` 中的 `nextStep` 硬编码步骤索引

[baseFormPage.js:367](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#L367)：
```js
if (this.data.currentStep === 3) {
```

步骤总数是 5 步（0-4），这里硬编码 `=== 3` 表示"最后输入步"。但不同表单页的步骤可能不同，这个值应该可配置。

### 23. `onScenarioChange` 是空函数

[complaint-form.js:847-848](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L847-L848)：
```js
onScenarioChange(e) {
},
```

无任何逻辑，应删除或添加实现。

### 24. `complaint-form.js` 中 `onClaimChange` 与 `onClaimItemTap` 功能重叠

[complaint-form.js:749](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L749) 和 [complaint-form.js:786](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L786) 提供了两种完全不同的选中/取消逻辑（一个通过 checkbox-group 的 value，一个通过手动切换）。同时 `onClaimChange` 和 `onClaimItemTap` 都重复了"选择 id=3 时弹出欺诈确认对话框"的逻辑。

### 25. `debounce` 函数已定义但从未使用

[complaint-form.js:1500-1510](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1500-L1510) 定义了 `debounce` 方法但整个文件中没有调用。

### 26. `complaint-form.js` 中 `nextStep` 覆写了 `BaseFormPage.nextStep`

`BaseFormPage.nextStep()` 已经实现了校验+前进+滚动的完整流程。但 `complaint-form.js:447` 完全覆写了这个方法，增加了 step0 自动设置 region 的逻辑。这本应通过一个 hook（如 `onBeforeNextStep`）注入，而不是完全覆写。

### 27. `constants.js` 中 `CLAIM_LABEL_MAP` 与 `CLAIM_OPTIONS` 数据不一致

```js
const CLAIM_OPTIONS = [
  { id: '1', label: '退货退款' },
  { id: '2', label: '更换商品' },
  // ...
];

const CLAIM_LABEL_MAP = {
  '1': '退货退款',
  '2': '换货',       // ← 不一致！CLAIM_OPTIONS 是"更换商品"
  '3': '赔偿损失',
  '4': '停止侵害',   // ← 不一致！CLAIM_OPTIONS id=4 是"损失赔偿"
  '5': '其他'         // ← 不一致！CLAIM_OPTIONS id=5 是"支付违约金"
};
```

`CLAIM_LABEL_MAP` 只有 5 项但 `CLAIM_OPTIONS` 有 7 项，映射关系也不对。目前 `CLAIM_LABEL_MAP` 仅被 `my-documents.js` 的协商函类型使用，但这是一个数据不一致的隐患。

---

## ✅ 亮点

| 亮点 | 说明 |
|---|---|
| **CSS 设计系统** | 完善的 CSS 变量体系（`app.wxss` 197 行），浅色/深色主题切换无缝 |
| **BaseFormPage 抽象** | 有模块化的意识，抽取了表单页的公共生命周期、键盘适配、草稿保存等 |
| **降级策略** | `searchCourts` 有完整的"云函数失败 → 规则兜底"策略 |
| **乐观更新** | `article.js` 收藏/点赞实现了乐观更新 + 失败回滚 |
| **内容安全** | 评论系统和昵称修改都集成了微信 `msgSecCheck` API |
| **配置集中化** | `constants.js` 集中管理业务常量和法律文本模板 |
| **HarmonyOS 适配** | 主动检测鸿蒙系统并做兼容处理 |

---

## 📋 优先改进建议

| 优先级 | 改进项 | 预估工作量 |
|---|---|---|
| 🔴 P0 | 修复浏览量双重递增 bug | 10 分钟 |
| 🔴 P0 | API Key 移至环境变量 | 30 分钟 |
| 🔴 P0 | 消除三个表单页间的重复代码（强化 BaseFormPage） | 6-8 小时 |
| 🔴 P0 | 提取 AI 润色逻辑到 `aiService.js` | 2 小时 |
| 🟠 P1 | 移除未使用的知晓云 SDK（节省 ~181KB） | 15 分钟 |
| 🟠 P1 | 修复 `onThemeChange` 监听器泄漏 | 30 分钟 |
| 🟠 P1 | 统一日期格式化函数到 `documentUtils.js` | 1.5 小时 |
| 🟠 P1 | `knowledge.js` 改用 `articleService` 避免重复查询逻辑 | 2 小时 |
| 🟠 P1 | 创建 `userService.js` 统一用户数据操作 | 3 小时 |
| 🟠 P1 | 修复 `checkIdCard` 逻辑不一致 | 30 分钟 |
| 🟡 P2 | 提取公共 Behavior (scroll、tabbar) | 2 小时 |
| 🟡 P2 | 添加 `globalArticleCache` TTL 和容量限制 | 1 小时 |
| 🟡 P2 | 统一 `async/await` 风格 | 3 小时 |
| 🟡 P2 | 清理空目录、废弃文件、备份文件夹 | 15 分钟 |
| 🟡 P2 | 修复 `CLAIM_LABEL_MAP` 数据不一致 | 15 分钟 |
| 🟡 P2 | 移除 `pdfUtils.js` 中无效 try-catch | 5 分钟 |
| 🟡 P2 | 删除未使用的 `debounce` 和空函数 `onScenarioChange` | 5 分钟 |
