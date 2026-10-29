# 衣律通 代码审查 — 第三轮跟进报告

---

## ✅ 第二轮报告中已修复的项目（15/17）

| # | 修复内容 | 文件 |
|---|---|---|
| 1 | `scrollBehavior` 已被 [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js)、[search.js](file:///d:/yilvtong/miniprogram/pages/search/search.js) 使用 | article.js, search.js |
| 2 | [report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js) 删除了冗余的 [onLoad](file:///d:/yilvtong/miniprogram/pages/document/document.js#15-22)/[onShow](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#73-78)/[nextStep](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#419-466) 覆写 | report-form.js |
| 3 | [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 改用 `BaseFormPage.onLoad.call(this, options)` + [onDraftLoaded](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#274-287) | negotiation-form.js |
| 4 | `BaseFormPage.loadDocumentData()` 集中化，加入 [onDraftLoaded(draft)](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#274-287) hook | baseFormPage.js |
| 5 | [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 改用 `userService`（收藏/足迹/检查） | article.js |
| 6 | [article.js](file:///d:/yilvtong/miniprogram/pages/article/article.js) 改用 `documentUtils` 的 [formatDateCN](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#12-20) + [formatRelativeTime](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#41-60) | article.js |
| 7 | [knowledge.js](file:///d:/yilvtong/miniprogram/pages/knowledge/knowledge.js) 改用 [formatDateISO](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#21-29) | knowledge.js |
| 8 | [articleService.js](file:///d:/yilvtong/miniprogram/services/articleService.js) 改用 [formatDateISO](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#21-29) from `documentUtils` | articleService.js |
| 9 | [list.js](file:///d:/yilvtong/miniprogram/pages/list/list.js) 改用 `userService.getUserFavorites/getUserHistory` | list.js |
| 10 | [my-documents.js](file:///d:/yilvtong/miniprogram/pages/my-documents/my-documents.js) 改用 `documentService.getDocuments/deleteDocument` | my-documents.js |
| 11 | [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 删除了冗余的 banner `.map()` | index.js |
| 12 | [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 改用 `userService.createUser()` | profile.js |
| 13 | [complaint-detail.js](file:///d:/yilvtong/miniprogram/pages/complaint-detail/complaint-detail.js) 改用 [formatDate](file:///d:/yilvtong/miniprogram/utils/documentUtils.js#3-11) from `documentUtils` | complaint-detail.js |
| 14 | [report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js) 的 [exportPDF](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#284-313) 改为调用 `BaseFormPage.exportPDF.call(this)` | report-form.js |
| 15 | [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 删除了冗余的 [exportPDF](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#284-313) 覆写（使用 BaseFormPage 的） | negotiation-form.js |

---

## 🔴 严重问题（必须修复）

### 1. `report-form.js:292` — [generate()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#470-473) 方法声明缺失

> [!CAUTION]
> 这是一个 **语法错误**，会导致该文件完全无法解析，页面运行时会崩溃。

[report-form.js:291-307](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js#L291-L307)

当前代码：
```js
  return true;
},

                          // ← 这里缺少 generate() { 声明
    this.setData({ isGenerating: true });
    
    const text = this.generateText();
    ...
  },
```

**修复方式：** 在第 292 行添加方法声明头：
```diff
  return true;
},

+ generate() {
    this.setData({ isGenerating: true });
```

---

### 2. `profile.js:178` — 引用未声明的 `db` 变量

[profile.js:176-179](file:///d:/yilvtong/miniprogram/pages/profile/profile.js#L176-L179)

```js
const success = await userService.updateCurrentUser({
  ...dataToUpdate,
  updateTime: db.serverDate()  // ❌ db 未在此文件中声明
});
```

[profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) 已不再在顶部声明 `const db = wx.cloud.database()`（因为改用了 Service），但这行代码仍直接使用 `db`，会抛出 `ReferenceError`。

**修复方式（二选一）：**

方案 A — 让 Service 自动设置 `updateTime`（推荐）：
```diff
const success = await userService.updateCurrentUser({
  ...dataToUpdate,
- updateTime: db.serverDate()
});
```
因为 `userService.updateUser()` → `documentService.updateDocument()` 内部已经自动添加 `updatedAt: db.serverDate()`。

方案 B — 添加 `db` 声明：
```diff
+ const db = wx.cloud.database();
const success = await userService.updateCurrentUser({
  ...dataToUpdate,
  updateTime: db.serverDate()
});
```

---

## 🟠 中等优化项

### 3. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 仍覆写 [exportPDF](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#284-313)

[complaint-form.js:1284-1311](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L1284-L1311) 完整覆写了 `BaseFormPage.exportPDF()`，逻辑完全相同（只是 title 为 `'民事起诉状'`）。

**建议：** 删除此覆写，`BaseFormPage.exportPDF()` 已调用 `this.getPDFTitle()` 获取标题，而 [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 已实现了 [getPDFTitle()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#454-457) 返回 `'民事起诉状'`。

---

### 4. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 的 [onLoad](file:///d:/yilvtong/miniprogram/pages/document/document.js#15-22) 仍覆写 BaseFormPage

[complaint-form.js:224-239](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L224-L239) 覆写了 `BaseFormPage.onLoad()`，添加了额外逻辑（设置默认日期）。

当前：
```js
onLoad(options) {
  const { statusBarHeight, navBarHeight } = getApp().globalData;
  const headerHeight = (statusBarHeight || 20) + (navBarHeight || 44);
  this.setData({ headerHeight });
  this.measureHeader();

  if (options.fromDraft) {
    this.loadDocumentData();
  } else {
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      'formData.purchaseInfo.date': today,
      'formData.negotiation.date': today
    });
  }
},
```

**建议：** 使用和 [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 相同的模式：
```js
onLoad(options) {
  BaseFormPage.onLoad.call(this, options);
  if (!options.fromDraft) {
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      'formData.purchaseInfo.date': today,
      'formData.negotiation.date': today
    });
  }
},
```

---

### 5. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 中 [nextStep](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#419-466) 和 [jumpToStep](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#375-418) 仍覆写

[complaint-form.js:405-494](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L405-L494) 覆写了 [nextStep()](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#419-466) 和 [jumpToStep()](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#375-418)（约 90 行），其中加入了 court 自动设置等额外逻辑。

这些覆写有**业务必要**——complaint-form 确实需要在 step 0 → 1 时自动设置法院区域。但建议把额外逻辑移到一个 `onStepChange(fromStep, toStep)` hook 中，让 [nextStep](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#419-466) 和 [jumpToStep](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#375-418) 保持使用 BaseFormPage 版本。

---

### 6. [index.js](file:///d:/yilvtong/miniprogram/pages/index/index.js) 的 articles `.map()` 仍有字段重命名

[index.js:131-135](file:///d:/yilvtong/miniprogram/pages/index/index.js#L131-L135)：

```js
articles: hotArticles.map(item => ({
  ...item,
  view_count: item.view,   // 字段重命名
  fav_count: item.collect   // 字段重命名
}))
```

这是为了前端模板的字段名匹配。如果模板中直接使用 `item.view` 和 `item.collect`，可以省去这次 `.map()`。否则可考虑在 `articleService.getHotArticles()` 中直接返回 `view_count`/`fav_count` 字段名。

---

### 7. [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 的 [onShow](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#73-78) 覆写未调用 BaseFormPage

[negotiation-form.js:83-89](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js#L83-L89)：

```js
onShow() {
  if (this.data.currentStep === 4 && this.data.generatedText) {
    this.setData({ ... });
  }
},
```

这完全覆盖了 `BaseFormPage.onShow()`（其中包含 [loadLatestContent()](file:///d:/yilvtong/miniprogram/utils/baseFormPage.js#111-123) 逻辑），导致已生成的文书在返回时不会刷新最新内容。

**建议：**
```js
onShow() {
  BaseFormPage.onShow.call(this);
  if (this.data.currentStep === 4 && this.data.generatedText) {
    this.setData({ ... });
  }
},
```

---

## 🟡 低优先级优化

### 8. [complaint-form.js](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js) 中 `currentStep/maxReachedStep/documentId` 的 data 重复声明

[complaint-form.js:11-22](file:///d:/yilvtong/miniprogram/pages/complaint-form/complaint-form.js#L11-L22)：
```js
currentStep: 0,        // BaseFormPage.data 中已有
maxReachedStep: 0,     // BaseFormPage.data 中已有
isExporting: false,    // BaseFormPage.data 中已有
generatedPdfFileID: null, // BaseFormPage.data 中已有
documentId: null,      // BaseFormPage.data 中已有
```

[report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js) 和 [negotiation-form.js](file:///d:/yilvtong/miniprogram/pages/negotiation-form/negotiation-form.js) 同理均有 `currentStep: 0` 和 `maxReachedStep: 0` 重复。这些在 `...BaseFormPage.data` 展开后已被包含，重复声明属于冗余代码。

---

## 📋 总结

| 优先级 | 数量 | 说明 |
|---|---|---|
| 🔴 严重 | 2 | [report-form.js](file:///d:/yilvtong/miniprogram/pages/report-form/report-form.js) 语法错误 + [profile.js](file:///d:/yilvtong/miniprogram/pages/profile/profile.js) `db` 未声明 |
| 🟠 中 | 5 | 覆写优化、hook 提取、字段映射统一 |
| 🟡 低 | 1 | data 字段冗余声明 |

**代码质量评分：7.5/10**（较上轮 7/10 略有提升，但两个运行时错误需要立即修复）

> [!IMPORTANT]
> 请**优先修复**第 1 和第 2 项——它们是**运行时错误**，会导致页面崩溃。其余项目均为代码整洁性优化，可后续迭代处理。
