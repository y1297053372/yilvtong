# 衣律通小程序 代码全面审查报告

> 审查日期：2026-03-03  
> 审查范围：`miniprogram/` 全部 JS 文件（19 个页面、4 个工具库、3 个服务层、1 个行为、1 个配置、自定义 TabBar）

---

## 一、错误类问题 (Bugs)

### 🔴 1. [documentService.js](file:///d:/yilvtong/miniprogram/services/documentService.js) — 链式 `.where()` 不会累加过滤条件

[documentService.js](file:///d:/yilvtong/miniprogram/services/documentService.js#L9-L18)

```js
let query = db.collection('documents').where({ _openid: '{openid}' });
if (type) {
  query = query.where({ type });  // ❌ 第二次 where 会覆盖第一次，而非追加
}
if (status) {
  query = query.where({ status }); // ❌ 同上
}
```

微信小程序云数据库中，**多次链式调用 `.where()` 不会合并条件**，后一个 `.where()` 会覆盖前一个。这意味着当同时传入 `type` 和 `status` 时，`_openid` 过滤条件会丢失，可能返回其他用户的数据。

> **修复方案**：构建一个完整的条件对象后，一次性调用 `.where()`。

---

### 🔴 2. [aiService.js](file:///d:/yilvtong/miniprogram/utils/aiService.js) — [cleanAIText](file:///d:/yilvtong/miniprogram/utils/aiService.js#83-114) 中多余的正则逻辑

[aiService.js](file:///d:/yilvtong/miniprogram/utils/aiService.js#L83-L113)

```js
const closingRegex = /(此致|具状人|特向贵院|故原告|综上所述|谨此|申请人：)/;
const splitIndex = cleanText.search(closingRegex);
if (splitIndex > -1) {
  // ❌ 这里又重新搜索了 "此致|具状人"，前面的 closingRegex 判断完全被浪费
  if (cleanText.match(/此致|具状人/)) {
    cleanText = cleanText.substring(0, cleanText.search(/此致|具状人/));
  }
}
```

`splitIndex` 已经检测到了匹配位置，但内部又重新用另一个正则搜索，而且只截取了 `此致|具状人` 的情况，忽略了 `特向贵院|故原告|综上所述|谨此|申请人：` 等情况。逻辑不一致且有冗余。

---

### 🔴 3. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) — [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-20) 局部重新定义遮蔽了导入

[complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L3)

文件顶部已导入 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-20)：
```js
const { checkIdCard, extractIdCardInfo, formatDateCN, formatDate } = require('../../utils/documentUtils');
```

但在 [generateText()](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#309-393) (L969) 内部又局部定义了一个同名函数 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-20)，遮蔽（shadow）了外部导入。两个函数行为不同（局部版本不含数字补零），可能造成日期格式不一致。

---

### 🟡 4. [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js) — 身份证校验正则有遗漏

[documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#L171-L176)

15位和18位身份证正则中，日期部分 `[0-2][1-9]` 无法匹配第 10、20、30 日期中的 "10" 已被单独处理，但无法匹配 "31" 日中的某些合法组合（如 `[0-2][1-9]` 无法匹配 "**20**" 日——已通过 `|20` 处理，但 10 日和 30 日也同理）。不过仔细看，`10|20|30|31` 已经补充。只是 `[0-2][1-9]` 匹配范围包括 `09` 但不包括 `00`。总体上，这个正则对少数极端边界日期（如 02-30）不会拒绝，验证不够精确。

---

### 🟡 5. [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) — [deleteDocument](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#299-330) 的 count 字段名推导错误

[my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#L310)

```js
const countName = listName.replace(/s$/, 'Count');
```

- `civilComplaints` → `civilComplaintCount` ✅
- `reportLetters` → `reportLetterCount` ✅
- `negotiationLetters` → `negotiationLetterCount` ✅

虽然当前恰好能工作（因为三个列表名都以 `s` 结尾），但这种用正则推导字段名的方式非常脆弱，属于 **bad practice**。

---

## 二、冗余代码 (Redundancy)

### 🟠 1. [report-detail.js](file:///d:/yilvtong/miniprogram/pages/report-detail/report-detail.js) 与 [negotiation-detail.js](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js) 高度重复

两个文件的代码结构几乎完全一致（[loadDocument](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#32-58)、[startEditing](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#71-74)、[stopEditing](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#75-78)、[saveEditing](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js#165-180)、[onEditorReady](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#99-110)、[onEditorInput](file:///d:/yilvtong/miniprogram/pages/report-detail/report-detail.js#110-114)、[saveToCloud](file:///d:/yilvtong/miniprogram/pages/report-detail/report-detail.js#115-130)、[getFullContent](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#133-137)、[continueEditing](file:///d:/yilvtong/miniprogram/pages/report-detail/report-detail.js#142-161)、[copyText](file:///d:/yilvtong/miniprogram/pages/report-detail/report-detail.js#162-176)、[exportPDF](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#175-191)），仅有少量差异：
- 签名分割标记不同（`发函方签字/盖章：` vs `举报人：`）
- PDF标题不同

> **建议**：抽取一个 `BaseDetailPage` 基类（类似 `BaseFormPage`），将公共逻辑集中。

---

### 🟠 2. [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 中手动实现 [onPageScroll](file:///d:/yilvtong/miniprogram/pages/index/index.js#62-77) + [onBackToTop](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#197-202)，但 `scrollBehavior` 已有

[index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js#L62-L82) 手动实现了 back-to-top 逻辑，而 [behaviors/scrollBehavior.js](file:///d:/yilvtong/miniprogram/behaviors/scrollBehavior.js) 已经提供了完全相同的功能，且 [search.js](file:///d:/yilvtong/miniprogram/pages/search/search.js) 和 [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 已使用该 behavior。

> **建议**：[index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 使用 `behaviors: [scrollBehavior]` 消除重复代码。

---

### 🟠 3. [constants.js](file:///d:/yilvtong/miniprogram/config/constants.js) 中 `CLAIM_LABEL_MAP` 与 `CLAIM_OPTIONS` 数据重复

[constants.js](file:///d:/yilvtong/miniprogram/config/constants.js#L39-L47)

`CLAIM_LABEL_MAP` 的内容完全可以从 `CLAIM_OPTIONS` 动态生成：
```js
const CLAIM_LABEL_MAP = Object.fromEntries(CLAIM_OPTIONS.map(c => [c.id, c.label]));
```
同理，`REPORT_CLAIM_LABEL_MAP` 也可以从 `REPORT_CLAIM_OPTIONS` 生成。

---

### 🟠 4. [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 中的 `claimOptionsMap` 与 `causeOptionsMap` 重复定义

[my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#L168-L187)

`causeOptionsMap` 的内容与 [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 中的 `causeOptions` 重复。`claimOptionsMap` 的内容与 [constants.js](file:///d:/yilvtong/miniprogram/config/constants.js) 中的 `CLAIM_LABEL_MAP` 重复但**值不同**（如 `1` 在 constants 中是"退货退款"，在此文件中也是"退货退款"，但 `2` 在 constants 中是"更换商品"，而此文件中是"发货"）。

> ⚠️ **这可能是一个 bug**：complaint-form 页面的诉讼请求选项 `id: '2'` 标签为"发货"，而 constants.js 的协商函 `CLAIM_LABEL_MAP` 中 `'2'` 为"更换商品"。两者含义不同但共用了数字 ID，如后续不小心混用会造成标签错误。

---

### 🟠 5. 多个页面重复的 [handleInput](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#522-529)、[onDateChange](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#114-119) 等方法

[complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js)、[report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js)、[negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 三个表单页面都各自定义了几乎一模一样的 [handleInput](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#522-529)、[onDateChange](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#114-119) 方法。这些可以提取到 `BaseFormPage` 中。

---

### 🟠 6. [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) 直接查询数据库而非复用 `articleService`

[knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L259-L369) 中的 [loadArticles()](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#259-371) 直接操作 `wx.cloud.database()` 进行文章查询，没有复用 `articleService`，导致：
- 数据转换逻辑（字段映射）重复
- 缺少 `articleService` 提供的错误处理模式
- 如果文章集合结构变更，需要维护多处

---

## 三、效率低下 (Performance)

### 🟡 1. [userService.js](file:///d:/yilvtong/miniprogram/services/userService.js) — N+1 查询严重

[userService.js](file:///d:/yilvtong/miniprogram/services/userService.js#L62-L78)

[addToFavorites](file:///d:/yilvtong/miniprogram/services/userService.js#62-67)、[removeFromFavorites](file:///d:/yilvtong/miniprogram/services/userService.js#68-73)、[addToHistory](file:///d:/yilvtong/miniprogram/pages/article/article.js#377-381) 每个方法都先调用 [updateCurrentUser()](file:///d:/yilvtong/miniprogram/services/userService.js#56-61)，而 [updateCurrentUser()](file:///d:/yilvtong/miniprogram/services/userService.js#56-61) 内部又先调用 [getCurrentUser()](file:///d:/yilvtong/miniprogram/services/userService.js#5-16) 再调用 [updateUser()](file:///d:/yilvtong/miniprogram/services/userService.js#44-55)。这意味着每次操作需要 **2 次数据库请求**。

同样，[checkInFavorites](file:///d:/yilvtong/miniprogram/services/userService.js#80-86)、[getUserFavorites](file:///d:/yilvtong/miniprogram/services/userService.js#87-91)、[getUserHistory](file:///d:/yilvtong/miniprogram/services/userService.js#92-96) 都独立调用 [getCurrentUser()](file:///d:/yilvtong/miniprogram/services/userService.js#5-16)，如果在同一个页面依次调用这些方法，会产生大量冗余的数据库查询。

> **建议**：引入用户信息缓存机制（内存缓存 + TTL），避免每次操作都重新查询。

---

### 🟡 2. [articleService.js](file:///d:/yilvtong/miniprogram/services/articleService.js) — 综合搜索时一次性取 50 条再在客户端排序

[articleService.js](file:///d:/yilvtong/miniprogram/services/articleService.js#L151-L226)

当 `orderBy === 'comprehensive'` 时，代码取出最多 50 条记录到客户端，在 JS 中进行打分排序。这有两个问题：
1. 如果文章超过 50 条，关键词相关度最高的结果可能不在前 50 条中
2. 每个 token 都创建新的 `RegExp` 对象并逐条匹配，效率较低

---

### 🟡 3. [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) — [onShow](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#27-32) 每次都请求云端数据

[profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js#L70-L76)

每次 [onShow](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#27-32) 都调用 [fetchUserProfile()](file:///d:/yilvtong/miniprogram/pages/profile/profile.js#78-100)，从云数据库拉取用户信息和文书数量。在 Tab 频繁切换场景下会产生大量不必要的网络请求。

> **建议**：添加时间戳控制（如 30 秒内不重复请求），或利用 `globalData.needRefreshDocuments` 做条件刷新。

---

### 🟡 4. [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) — [loadArticle](file:///d:/yilvtong/miniprogram/pages/document-article/document-article.js#95-196) 使用回调风格而非 async/await

[article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js#L434-L499)

同一文件中 [loadComments](file:///d:/yilvtong/miniprogram/pages/article/article.js#90-144) 用的是 Promise 风格，[loadArticle](file:///d:/yilvtong/miniprogram/pages/document-article/document-article.js#95-196) 用的是回调风格 (`success/fail`)，风格不统一。建议统一使用 `async/await`。

---

### 🟡 5. [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) — [onShow](file:///d:/yilvtong/miniprogram/pages/negotiation-detail/negotiation-detail.js#27-32) 每次都重新加载全部数据

[my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#L28-L36)

即便 `needRefreshDocuments` 为 `false` 也会调用 [loadData()](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js#38-44)。检查了标志位但没有用它来决定是否加载。

---

## 四、可优化项 (Improvements)

### 💡 1. [baseFormPage.js](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js) — [onHide](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#79-82) 和 [onUnload](file:///d:/yilvtong/miniprogram/pages/article/article.js#82-87) 双重保存

[baseFormPage.js](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#L79-L95)

[onHide()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#79-82) 和 [onUnload()](file:///d:/yilvtong/miniprogram/pages/article/article.js#82-87) 都调用 [saveDraftToCloud()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#155-166)，在正常页面跳转时 [onHide](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#79-82) 和 [onUnload](file:///d:/yilvtong/miniprogram/pages/article/article.js#82-87) 可能依次触发，**导致重复保存**。建议增加防抖或去重机制。

---

### 💡 2. [app.js](file:///d:/yilvtong/miniprogram/app.js) — `globalData` 字段分散初始化

[app.js](file:///d:/yilvtong/miniprogram/app.js#L2-L5)

部分 `globalData` 属性在声明中定义（L2-5），部分在 [onLaunch](file:///d:/yilvtong/miniprogram/app.js#8-44) 中动态添加（L17-36）。建议统一在声明中列出所有字段及默认值，提高可读性。

---

### 💡 3. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) — [jumpToStep](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#363-406) 覆盖了 BaseFormPage 但逻辑大幅不同

[complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L363-L405) 完全重写了 [jumpToStep](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#363-406) 的逻辑，包含复杂的条件分支和多处 [generate()](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#394-412) 调用。与 `BaseFormPage.jumpToStep` 的约定不同，但没有明确注释说明原因。

> **建议**：在代码中添加注释说明为什么需要覆盖，或者将通用逻辑保留在 BaseFormPage、仅覆盖差异部分。

---

### 💡 4. 缺少统一的错误处理/上报机制

项目中所有错误处理都是 `console.error` + `wx.showToast`，没有统一的错误上报或监控。建议：
- 封装一个全局 `handleError(err, userMessage)` 工具函数
- 考虑接入微信小程序的实时日志功能 (`wx.getRealtimeLogManager()`)

---

### 💡 5. [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js) 中 [generateClaimText](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#83-113) 使用 if-else 链

[documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#L83-L112)

7 个分支的 `if-else if` 链可以改为 Map/对象映射 + 模板函数模式，更易维护。

---

### 💡 6. [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) — [setDefaultDeadlineDate](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#92-104) 未考虑工作日

[negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L92-L103)

默认截止日期用简单的 `+10天` 来计算，但 [handleInput](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#522-529) 中 `deadline.days` 变化时调用了 [calculateFinalDate(days)](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#155-170) 函数（该函数排除周末）。两者计算逻辑不一致。

> **建议**：统一使用 [calculateFinalDate()](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#155-170) 来设置默认值。

---

### 💡 7. [document-article.js](file:///d:/yilvtong/miniprogram/pages/document-article/document-article.js) 和 [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) — HTML 处理逻辑重复

两个页面都有相似的 `img` 处理和 `href` 清洗逻辑。建议抽取到 [documentUtils.js](file:///d:/yilvtong/miniprogram/utils/documentUtils.js) 作为公共工具函数。

---

### 💡 8. [app.json](file:///d:/yilvtong/miniprogram/app.json) — `tabBar.list` 中的图标路径使用 `.png` 而 custom-tab-bar 使用 `.svg`

[app.json L39-40](file:///d:/yilvtong/miniprogram/app.json#L39-L40) 中 tabBar 配置引用的是 `.png` 图标，而 [custom-tab-bar/index.js](file:///d:/yilvtong/miniprogram/custom-tab-bar/index.js#L11-L12) 中引用的是 `.svg` 图标。虽然自定义 tabBar 会覆盖系统 tabBar 的渲染，但保持配置一致性更好。

---

### 💡 9. [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) — 未限制查询条数

[knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js#L343)

```js
const res = await query.get(); // 没有 .limit()
```

微信云数据库 `.get()` 默认最多返回 20 条，如果文章超过 20 条将会截断，且用户不知道。建议显式设置 `.limit(100)` 或实现分页加载。

---

## 五、总结

| 类别 | 数量 | 严重程度 |
|------|------|----------|
| **错误 (Bugs)** | 5 | 🔴 高 2 / 🟡 中 3 |
| **冗余 (Redundancy)** | 6 | 🟠 中 |
| **效率 (Performance)** | 5 | 🟡 中 |
| **优化 (Improvements)** | 9 | 💡 建议 |

### 优先处理建议：
1. **立即修复**：[documentService.js](file:///d:/yilvtong/miniprogram/services/documentService.js) 的 `.where()` 覆盖问题（影响数据安全）
2. **尽快修复**：[aiService.js](file:///d:/yilvtong/miniprogram/utils/aiService.js) 的 [cleanAIText](file:///d:/yilvtong/miniprogram/utils/aiService.js#83-114) 逻辑不一致
3. **建议优化**：抽取 `BaseDetailPage`，消除 `report-detail` 和 `negotiation-detail` 的重复代码
4. **建议优化**：`userService` 引入用户缓存、统一错误处理机制
