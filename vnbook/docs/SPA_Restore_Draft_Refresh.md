# SPA 页面刷新与草稿恢复机制优化方案

## 1. 背景与挑战

在移动端 SPA（单页应用）中，用户可能会在填写表单（如编辑单词、新建单词本）的过程中意外刷新页面。为了提升用户体验，我们需要实现“草稿自动保存与恢复”功能。

然而，在 Vue 3 + Vue Router 的架构下，特别是结合了**堆栈式持久化视图 (Stack Architecture)** 和 **异步组件加载** 时，实现稳定的草稿恢复面临以下挑战：

- **路由初始化的竞态条件 (Race Condition)**：页面刷新时，Vue Router 解析 URL 需要时间。组件的 `setup` 和 `onMounted` 可能在路由状态完全稳定之前执行，导致路径校验失败。
- **生命周期钩子的误判**：`onMounted` 钩子中的一次性检查过于脆弱。如果此时路由路径尚未就绪（例如处于中间状态），草稿会被误判为“路径不匹配”而清除。
- **状态保护缺失**：在恢复过程中（从读取 localStorage 到数据填充完成），任何外部干扰（如路由微调、父组件重新渲染）都可能触发清除逻辑，导致恢复失败。

## 2. 核心问题分析

### 为什么之前的方案不稳定？

1.  **过早的清除逻辑**：旧方案依赖 `watch(route.path)` 来清除草稿。在组件初始化过程中，如果路由发生微小变化（如参数变动或重定向），这个 `watch` 可能会被误触发，导致在恢复完成前清除草稿。
2.  **路径校验过于严格**：旧方案在 `onMounted` 中严格比对 `state._routePath` 和 `route.path`。由于末尾斜杠或参数顺序的细微差异，常导致校验失败。
3.  **缺乏状态机保护**：没有区分“正在恢复中”和“用户正常操作”这两种状态，导致恢复过程容易被打断。

## 3. 优化后的技术方案

我们采用 **“延迟校验 + 状态机保护”** 的策略，显著提升了容错性和稳定性。

### A. 引入 `hasRestored` 状态机

我们在 `useDialogDraft` 中引入了一个关键标志位 `hasRestored`。

- **未恢复前 (`hasRestored = false`)**：处于“宽容模式”。即使路由路径暂时不匹配，也不清除草稿，而是静静等待。
- **恢复后 (`hasRestored = true`)**：只有当明确已恢复或用户手动打开弹窗后，才进入“严格模式”，开始监控路由变化以清除草稿。

### B. 被动的 `checkAndRestore` 策略

不再只依赖 `onMounted` 的一次性检查。我们在 `watch(route.path)` 中也加入了检查逻辑：

- 如果当前还没恢复（`!hasRestored`），且路由发生了变化，我们**再次尝试恢复**。
- 这意味着，即使 `onMounted` 时路由还没准备好，等到路由终于稳定时，`watch` 会再次触发恢复逻辑，确保草稿最终能被加载。

### C. 路径归一化 (Normalization)

在比对路径时，统一移除末尾斜杠，消除了因格式差异（如 `/books` vs `/books/`）导致的误判。

### D. 严格的清除保护

`clearDraft` 操作现在被严密保护。只有在 `hasRestored` 为真（确认已进入正常交互阶段）且路由发生实质变化时，才会执行清除。在恢复过程中的任何波动都会被忽略。

## 4. 核心代码实现 (`useDialogDraft.ts`)

```typescript
// 尝试恢复草稿的核心逻辑
const checkAndRestore = async () => {
  if (hasRestored.value || isRestoring.value) return

  const saved = localStorage.getItem(storageKey)
  if (!saved) return

  try {
    const state = JSON.parse(saved)

    // 路径归一化处理
    const normalize = (p: string) => p.replace(/\/+$/, '')

    // 核心校验：如果路径不匹配，暂时不清除，也不恢复
    // 等待路由变化可能修正路径，或者由后续逻辑覆盖
    if (normalize(state._routePath) !== normalize(route.path)) {
      return
    }

    if (state._show && Date.now() - (state._timestamp || 0) < validity) {
      isRestoring.value = true
      hasRestored.value = true // 标记为已恢复

      // 1. 恢复显示状态
      show.value = true
      // 2. 同步路径状态
      openPath.value = route.path
      // 3. 恢复数据...
      await nextTick()
      await restoreState(state)

      // 4. 结束恢复
      setTimeout(() => {
        isRestoring.value = false
      }, 100)
    }
  } catch (e) {
    console.error('Failed to restore draft', e)
    clearDraft()
  }
}

// 监听路由变化
watch(
  () => route.path,
  (newPath, oldPath) => {
    if (newPath === oldPath) return

    if (hasRestored.value) {
      // 场景 A：已恢复或已打开，且路由发生了实质变化 -> 视为离开页面，清除草稿
      if (show.value && !isRestoring.value) {
        show.value = false
        clearDraft()
      }
    } else {
      // 场景 B：尚未恢复（可能是初始化时路径不对），尝试再次恢复
      checkAndRestore()
    }
  },
)
```

## 5. 总结

之前的代码假设“组件挂载时，世界是完美的（路由已就绪）”。
现在的代码假设“组件挂载时，世界是混乱的（路由可能还在变）”，它会耐心地等待正确的时机（路径匹配）出现，然后再执行恢复，并且在恢复完成前绝不轻易放弃（清除草稿）。

这种**防御性编程**的思维方式，是解决复杂前端生命周期问题的关键。
