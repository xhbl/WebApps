# 提升 SPA 中控件在页面使用中的交互体验实现思路和方案

## 1. 背景与挑战

在移动端单页应用 (SPA) 开发中，用户习惯于原生 App 的交互模式，特别是对“返回键”的预期。然而，Web 应用默认的路由机制往往无法完美适配这种预期，导致以下痛点：

- **返回键困境**：用户打开一个弹窗（如编辑框），点击物理返回键，期望是关闭弹窗，结果却是整个页面回退，导致数据丢失或体验中断。
- **交互冲突**：第三方 UI 库（如 Vant）自带的返回处理逻辑可能与自定义路由逻辑冲突，造成“双重回退”或状态不一致。
- **状态残留**：在 `KeepAlive` 缓存机制下，页面切换后，弹窗或菜单的状态可能被保留，导致再次进入时界面不干净。
- **操作互斥**：在长列表中，多个操作菜单（Popover）可能同时打开，缺乏统一的互斥管理。

## 2. 核心目标

本方案旨在构建一套健壮、统一的控件管理机制，实现以下目标：

1.  **原生级导航体验**：让物理返回键能够智能识别并关闭当前最上层的模态视图（Dialog/ActionSheet），而不影响底层页面路由。
2.  **轻量级交互优化**：对于非模态的轻量级菜单（Popover），实现点击空白处关闭、路由跳转自动关闭、以及同类互斥。
3.  **生命周期完备性**：确保在页面刷新、路由跳转、组件缓存恢复等各种场景下，控件状态都能正确重置或恢复。

## 3. 技术实现方案

我们将控件交互分为“重型”和“轻型”两类，分别采用不同的管理策略。

### A. 重型交互管理：`usePopupHistory` (针对 Dialog, ActionSheet, Popup)

此类控件通常全屏或半屏显示，阻断性强，用户强烈依赖返回键来关闭。

- **核心机制**：**历史记录接管 (History API)**
  - **打开时**：调用 `history.pushState` 向浏览器历史栈推入一个虚构状态。这使得物理返回键有了可消耗的记录，从而拦截了页面回退。
  - **关闭时**：
    - **物理返回**：监听 `popstate` 事件，捕获后关闭弹窗。
    - **手动关闭**：如果用户点击界面按钮关闭，代码主动调用 `history.back()` 消除虚构记录，保持历史栈清洁。
- **关键策略**：
  - **禁用默认行为**：显式设置 Vant 组件的 `:close-on-popstate="false"`，防止库自带逻辑与自定义逻辑冲突（避免“双重回退”）。
  - **路由敏感**：监听路由变化，一旦发生页面跳转（非回退），立即清理状态，防止弹窗跨页面残留。
  - **状态恢复**：配合 `useDialogDraft`，支持页面刷新后弹窗状态的自动恢复，并重新建立历史记录拦截。
  - **全局栈与智能接管（进阶）**：
    - **全局栈 (`popupStack`)**：在 Composable 外部维护一个全局数组，追踪当前应用内所有打开的弹窗 ID。这解决了嵌套弹窗（如编辑框 -> 确认框）的回退顺序问题，确保“后进先出”。
    - **智能接管**：初始化时检测 `popupStack` 和 `history.state`。
      - **嵌套打开**：若栈不为空，强制推入新记录。
      - **刷新恢复**：若栈为空但 `history.state` 包含标记（说明是刷新后的恢复），则**不推入**新记录，直接接管当前历史状态，防止历史栈膨胀。
    - **全局兜底监听**：注册全局 `window.addEventListener('popstate')`。当用户点击返回键，若应用内栈已空但浏览器历史仍处于“弹窗”状态，自动执行 `history.back()` 跳过无效状态，防止页面卡顿或意外退出。

### B. 轻型交互管理：`usePopoverMap` (针对 Popover)

此类控件通常是跟随元素的上下文菜单，非阻断性，用户习惯点击空白处或滚动页面关闭。

- **核心机制**：**内存状态映射 (State Mapping)**
  - **互斥管理**：维护一个响应式对象 `popoverMap`。当打开一个菜单时，自动将 Map 中其他所有 Key 设为 `false`，确保同一时间只有一个菜单张开。
  - **不拦截返回**：不推入历史记录。点击返回键时，允许页面正常回退，同时利用 Vant 默认行为或生命周期钩子自动关闭菜单。
- **关键策略**：
  - **PC 兼容**：在触发元素外层包裹 `@click.stop` 容器，配合根节点的 `@click="closeAllPopovers"`，完美解决 PC 端鼠标点击空白处关闭的问题。
  - **生命周期清理**：在 `onDeactivated` (离开缓存页面)、`onUnmounted` (销毁)、`watch(route)` (路由跳转) 时，强制关闭所有菜单，确保界面整洁。

### C. 架构设计图

```mermaid
graph TD
    User[用户操作] -->|点击打开| Control{控件类型?}

    Control -->|重型 (Dialog/ActionSheet)| Heavy[usePopupHistory]
    Control -->|轻型 (Popover)| Light[usePopoverMap]

    subgraph Heavy Strategy
    Heavy -->|pushState| HistoryStack[浏览器历史栈]
    HistoryStack -->|物理返回键| PopStateEvent[PopState 事件]
    PopStateEvent -->|捕获| CloseDialog[关闭弹窗]
    CloseDialog -->|拦截| PreventBack[阻止页面回退]
    end

    subgraph Light Strategy
    Light -->|记录ID| StateMap[状态映射表]
    StateMap -->|打开新项| CloseOthers[关闭其他项]
    User -->|点击空白/跳转| CloseAll[关闭所有]
    end
```

## 4. 实施细节与注意事项

1.  **统一规范**：
    - 所有 `van-dialog` / `van-action-sheet` / `van-popup` 必须使用 `usePopupHistory`，并设置 `:close-on-popstate="false"`。
    - 所有 `van-popover` 必须使用 `usePopoverMap`，外层包裹 `@click.stop`，且**不要**设置 `:close-on-popstate="false"`（利用默认行为辅助清理）。

2.  **KeepAlive 适配**：
    - 在 `usePopoverMap` 中集成 `onActivated` 钩子，再次进入缓存页面时执行一次“清理”，作为双重保险，防止僵尸菜单。

3.  **嵌套弹窗处理**：
    - `usePopupHistory` 引入了全局 `popupStack` 进行栈式管理，确保在 Dialog 中打开 ActionSheet 时，返回键能严格按照“后进先出”的顺序关闭最上层的弹窗。

## 5. 最终效果

经过上述方案的实施，应用达到了以下交互标准：

- **安全感**：用户可以放心地使用物理返回键来关闭任何弹窗，而不用担心意外退出当前工作流。
- **流畅性**：列表操作菜单（Popover）响应灵敏，互斥逻辑清晰，且在页面滚动或跳转时自动消失，毫无拖泥带水。
- **一致性**：无论是在 iOS 还是 Android，无论是通过手势还是按键，交互行为高度统一，接近原生 App 体验。
