# 衣律通 · 离线交互原型

> 不依赖微信、不依赖云开发、不依赖网络。双击 `index.html` 即可浏览。

## 这是什么

把原小程序的 **WXML / WXSS 直接转换渲染**成静态页面，不是重新画一遍。

| 来源 | 处理方式 |
|---|---|
| `miniprogram/pages/*/*.wxml` | 解析 WXML 语法（`wx:for` / `wx:if` / `{{}}` 表达式），用真实数据求值 |
| `miniprogram/pages/*/*.wxss` | `rpx → px` 按 375px 宽换算，选择器加作用域前缀 |
| `miniprogram/app.wxss` | `page {}` 映射到 `:root`，CSS 变量全局生效 |
| `miniprogram/components/*` | `custom-header` 等自定义组件真实渲染，含 props 与 slot |
| `数据库/*.json` | 59 篇文章全文、评论、文书作为页面数据 |

所以样式和结构与原小程序一致，包括配色、圆角、间距、字体层级、TabBar、导航栏。

## 怎么看

直接用浏览器打开 `prototype/index.html`。

或起个本地服务（避免个别浏览器对本地文件的限制）：

```bash
cd prototype
python -m http.server 8899
# 打开 http://127.0.0.1:8899/index.html
```

## 页面清单

| 文件 | 对应小程序页面 | 说明 |
|---|---|---|
| `index.html` | 首页 | 搜索、轮播、四大分类、热门推荐 |
| `knowledge.html` | 知识库 | 三级分类 + 真实文章列表 |
| `article.html` | 文章详情 | 富文本正文（真实内容、真实排版） |
| `document.html` | 文书生成 | 三种文书入口 |
| `complaint-form.html` | 民事起诉状 | 五步向导第 1 步 |
| `report-form.html` | 举报文书 | 五步向导第 1 步 |
| `negotiation-form.html` | 协商函 | 五步向导第 1 步 |
| `complaint-detail.html` | 起诉状预览 | 生成结果 |
| `report-detail.html` | 举报信预览 | |
| `negotiation-detail.html` | 协商函预览 | |
| `agency.html` | 维权代理 | FAQ 展开 |
| `profile.html` | 我的 | |
| `my-documents.html` | 我的文书 | 三种文书分类 |
| `search.html` | 搜索 | 搜索结果 |
| `list.html` | 我的收藏 | |
| `document-article.html` | 文书解读 | |
| `complaint-edit.html` | 编辑文书 | |

## 能做什么 / 不能做什么

**能：**
- 看所有页面的真实视觉（配色、布局、字号、图标、TabBar）
- 读 59 篇知识库文章的完整正文
- 点卡片跳转到对应页面（首页 → 知识库 → 文章；文书入口 → 表单）

**不能：**
- 填表提交（表单是静态快照，`textarea` 只读）
- AI 生成文书（需要混元模型，原型不含）
- 导出 PDF（需要云函数）
- 切换深色模式（固定浅色交付）

## 与真机的差异

| 项 | 说明 |
|---|---|
| 屏幕尺寸 | 固定 375 × 812（iPhone 逻辑分辨率），不做多端适配 |
| 状态栏 | 模拟 iOS 状态栏（时间、信号、Wi-Fi、电池） |
| 灵动岛 | 纯装饰 |
| 页面切换动画 | 无（小程序里的转场遮罩在原型中移除） |
| 滚动 | 内容区独立滚动，TabBar 与导航栏固定 |

## 重新生成

原型是从源码自动生成的，改了小程序代码后可以重跑：

```bash
# 1. 提取文章 / 评论 / 文书数据
python tools/extract_prototype_data.py

# 2. 渲染 17 个页面的 WXML
python tools/build_prototype.py

# 3. 转换 WXSS
python tools/wxss2css_v2.py

# 4. 生成 HTML 外壳
python tools/build_shell_v3.py

# 5. 校验（破图 / 残留绑定 / 文字量）
python tools/check_all_pages.py
```

## 工具链说明

| 脚本 | 职责 |
|---|---|
| `tools/wxml2html.py` | WXML 标签与属性 → HTML 语义映射 |
| `tools/wxml_render.py` | `{{}}` 表达式求值（变量、成员、数组下标、三元、比较、方法） |
| `tools/wxml_render_tree.py` | 结构渲染：`wx:for` / `wx:if` / `wx:elif` / `wx:else` / `mp-html` |
| `tools/component_render.py` | 自定义组件渲染（props 默认值、slot、样式作用域） |
| `tools/wxss2css.py` | `rpx→px`、`page→:root`、去深色模式 |
| `tools/wxss2css_v2.py` | 页面样式按选择器加作用域前缀 |
| `tools/extract_prototype_data.py` | 从数据库导出提取页面数据 |
| `tools/build_prototype.py` | 逐页组装上下文并渲染 |
| `tools/build_shell_v3.py` | 套设备外壳（状态栏 / 导航栏 / TabBar） |
| `tools/check_all_pages.py` | 全量校验 |

## 已知取舍

1. **固定浅色**：小程序支持深色模式，但浏览器的 `prefers-color-scheme` 与微信判断逻辑不同，直接搬运会出现「浅底白字」。原型统一浅色，保证看得到内容。
2. **表单只渲染第 1 步**：多步骤状态依赖 JS 运行时，静态快照取初始状态。
3. **图片**：文章封面来自本地备份，云端图片已不可用，破图统一降级为渐变占位。
