# Vue3_Vant_SPA_KeepAlive_Implementation_Guide

# 移动端 SPA 状态保持与布局优化

## 1. 核心目标

在三级页面跳转（单词本 -> 单词列表 -> 单词卡片）中，实现类似原生 App 的体验：

- 回退不刷新：保持上一级页面的数据和 DOM 状态。

- 位置记忆：精准恢复滚动条位置。

- 布局稳定：防止移动端浏览器地址栏/工具栏伸缩导致的页面跳动或遮挡。

## 2. 技术实现方案

### A. 架构层：KeepAlive 缓存机制

- 配置位置：App.vue

- 实现方式：使用 <router-view> 插槽配合 <keep-alive>，通过 :include 属性精确控制缓存对象。

- 关键点：组件必须显式声明 name 属性（BooksList, WordsList），否则缓存无效。

### B. 布局层：CSS 强制占位（解决遮挡的核心）

- 问题根源：Vant 的 placeholder 属性依赖 JS 动态计算高度。在 KeepAlive 缓存恢复时，JS 计算可能滞后或失效，导致页面内容顶到顶部被 fixed 导航栏遮挡。

- 解决方案：
  - 关闭 JS 占位：<van-nav-bar :placeholder="false" ... />。

  - 启用 CSS 占位：在容器样式中添加 padding-top: var(--van-nav-bar-height);。

- 优势：CSS 渲染优于 JS 执行，无论组件生命周期如何，布局始终稳固，彻底消除了“页面上移/遮挡”和“回退时跳动”的现象。

### C. 交互层：滚动位置管理

- 禁用原生恢复：在 router/index.ts 中设置 history.scrollRestoration = 'manual'，防止浏览器与我们的代码冲突。

- 手动记录与恢复：
  - 离开时 (onBeforeRouteLeave)：记录 window.scrollY。

  - 回来时 (onActivated)：执行 window.scrollTo(0, scrollTop.value)。

- 智能刷新策略 (WordsListView)：
  - 利用 currentBid 标记当前缓存的是哪个单词本。

  - 同本回退：仅恢复滚动位置，静默更新数据。

  - 异本切换：清空数据，重置滚动条到顶部，显示 Loading。

## 3. 最终效果

应用具备以下特性：

- 流畅回退：从单词卡片返回列表，瞬间到位，无白屏，无加载转圈。

- 位置精准：无论列表多长，回退时都能精确停留在刚才点击的位置。

- 视觉稳定：无论浏览器地址栏如何伸缩，顶部导航栏始终稳固，内容不会被遮挡。
