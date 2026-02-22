# SPA从独立DOM路由优化成堆栈式持久化视图的技术方案

## 1. 背景与目标

**原架构痛点**：
传统的 Vue Router 模式在页面跳转时会销毁旧组件、挂载新组件。虽然配合 `KeepAlive` 可以缓存状态，但在移动端存在以下问题：

- **滚动位置丢失**：浏览器原生的滚动恢复在异步数据加载下往往不准确，需要复杂的 `scrollTop` 手动管理。
- **回退卡顿**：回退时需要重新渲染 DOM，无法做到“零延迟”。
- **交互生硬**：缺乏原生 App 那种“页面层叠”的视觉连贯性。

**优化目标**：

- **视图持久化**：三级页面（单词本 -> 单词列表 -> 单词卡片）同时驻留 DOM，互不销毁。
- **原生级导航**：前进滑入，后退滑出（揭示底层页面），位置完美保留。
- **数据智能流转**：前进刷新数据，后退复用数据，刷新浏览器自动恢复。

---

## 2. 核心架构变革

### 2.1 堆栈式容器 (Stack Container)

放弃 `router-view` 对核心业务页面的控制，转为在 `App.vue` 中手动管理三个层级的组件实例。

- **层级定义**：
  - Level 1: `BooksList` (底层)
  - Level 2: `WordsList` (中间层)
  - Level 3: `WordCard` (顶层)
- **状态控制**：
  通过计算路由深度 (`routeDepth`) 动态分配 CSS 类：
  - `layer-active`: 当前视图 (transform: 0)
  - `layer-hidden`: 待进入视图 (transform: 100%)
  - `layer-background`: 背景视图 (transform: -25%，视差效果)

### 2.2 布局重构 (Flexbox over Fixed)

由于 CSS `transform` 会导致子元素 `position: fixed` 的定位上下文变为父容器而非视口，导致导航栏失效。

- **全局锁定**：`body { overflow: hidden; height: 100%; }`，禁止文档流滚动。
- **Flex 布局**：所有页面组件改为 `display: flex; flex-direction: column`。
  - **Header/Footer**：静态布局，不参与滚动。
  - **Content**：`flex: 1; overflow-y: auto`，作为独立的滚动容器。

---

## 3. 关键实施步骤

### 步骤一：路由与视图解耦

1.  在 `App.vue` 中预先挂载三个核心组件。
2.  使用 `v-show="isStackRoute"` 控制堆栈容器的显示。
3.  非核心页面（如登录、用户管理）保留传统 `router-view`。

### 步骤二：数据流转逻辑改造

从 `onActivated` (KeepAlive) 转向 `watch` (响应式侦听)。

- **BooksList**：`onMounted` 加载一次，之后常驻内存。
- **WordsList**：
  - 监听 `route.params.bid`。
  - **前进/切换**：`newBid !== oldBid` -> 清空数据 -> 滚动到顶 -> 加载新数据。
  - **后退**：`newBid === oldBid` -> **什么都不做** (DOM 和滚动条保持原样)。
- **WordCard**：
  - 监听 `route.params.wid`。
  - 利用 Store 共享数据，直接定位到对应卡片，无需网络请求。

### 步骤三：浏览器刷新恢复 (Hydration)

处理用户在深层页面（如卡片页）直接刷新浏览器的场景。

- **问题**：刷新后内存清空，回退到列表页时 `currentBid` 丢失，导致列表空白。
- **修复**：在 `WordsList` 的 `watch` 中增加对路由名称的检测。如果路由变回 `WordsList` 且当前无数据，强制触发加载。

---

## 4. 遇到的坑与解决方案 (注意事项)

### 4.1 `position: fixed` 失效

- **现象**：页面切换动画中，顶部导航栏跟随页面滚动，或位置错乱。
- **解决**：移除 `fixed`，改用 Flex 布局，让导航栏作为 Flex 的头部自然置顶。

### 4.2 iOS 安全区域 (Safe Area)

- **现象**：刘海屏遮挡导航栏内容。
- **解决**：在 `padding-top` 中增加 `env(safe-area-inset-top)`，并配合 `box-sizing: content-box`。

### 4.3 Vant IndexBar 漂移

- **现象**：`van-index-bar` 的吸顶锚点在页面 `transform` 动画期间计算位置错误，导致视觉跳动或偏移。
- **解决**：
  1.  禁用组件的 `:sticky="false"`，停止其 JS 定位计算。
  2.  通过 CSS 隐藏锚点条 (`height: 0`)，只保留右侧索引功能，彻底消除视觉 Bug。

### 4.4 手势回退冲突

- **现象**：iOS 侧滑返回时，触发了 Vue 动画导致“双重动画”，或误触卡片滑动。
- **解决**：
  1.  统一使用 CSS 过渡动画，确保交互一致性。
  2.  在卡片页拦截左侧边缘 (`x < 40px`) 的 `touchstart` 事件，防止误触 `van-swipe`。

---

## 5. 最终达成效果

1.  **极致的流畅度**：页面切换完全由 GPU 加速的 CSS Transform 驱动，无 JS 渲染阻塞。
2.  **完美的位置记忆**：从详情页返回列表，滚动条位置 1 像素不差，且无任何闪烁。
3.  **零加载延迟**：回退操作不需要重新请求 API，不需要重新渲染 DOM，内容即刻呈现。
4.  **原生 App 质感**：配合视差滚动动画和稳定的布局，用户体验已极度接近原生 iOS/Android 应用。
