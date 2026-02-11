import { watch, onUnmounted, onDeactivated, ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'

// 全局栈：用于追踪当前活跃的弹窗 ID，解决嵌套弹窗的回退顺序问题
const popupStack: string[] = []

// 全局监听器：当 UI 栈为空但历史记录仍显示弹窗打开时，自动回退
// 这解决了“嵌套弹窗刷新后只恢复了一层，导致回退时卡在中间历史状态”的问题
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // 延时确保 Vue 组件已响应 popstate 并更新了 popupStack
    setTimeout(() => {
      if (popupStack.length === 0 && history.state?.popupOpen) {
        history.back()
      }
    }, 20)
  })
}

/**
 * 弹窗历史记录管理 Hook
 * 在弹窗打开时推送一条历史记录，确保点击浏览器返回键时只关闭弹窗而不回退页面
 */
export function usePopupHistory(show: Ref<boolean>) {
  const route = useRoute()
  const historyPushed = ref(false)
  const popupPath = ref('')
  const popupId = ref('')

  const handlePopState = () => {
    if (!show.value || !historyPushed.value) return

    const currentId = history.state?.popupId
    const myIndex = popupStack.indexOf(popupId.value)
    const currentIndex = popupStack.indexOf(currentId)

    // 智能判断：
    // 如果当前历史状态对应的弹窗在栈中位于我之下（currentIndex < myIndex），说明发生了回退，我应该关闭。
    // 如果当前历史状态是我自己或在我之上（嵌套弹窗），说明是前进或同级操作，我应该保持打开。
    // 注意：currentIndex === -1 表示当前历史状态不在栈中（可能是之前的页面），通常也视为回退
    if (currentIndex < myIndex) {
      show.value = false
      historyPushed.value = false
    }
  }

  watch(
    show,
    (val) => {
      if (val) {
        if (!historyPushed.value) {
          popupPath.value = route.fullPath
          // 生成唯一 ID 并入栈
          popupId.value = Date.now().toString(36) + Math.random().toString(36).substr(2)
          popupStack.push(popupId.value)

          // 核心逻辑：
          // 1. 如果是嵌套弹窗 (popupStack.length > 1)，必须推入新记录，确保每个弹窗都有独立的历史状态。
          // 2. 如果是刷新恢复 (popupStack.length === 1 且 history.state.popupOpen)，则接管当前记录，不推入。
          const isNested = popupStack.length > 1

          if (!isNested && history.state?.popupOpen) {
            // 刷新恢复：接管当前状态，不 push
          } else {
            // 正常打开或嵌套：推入新记录
            const state = { ...history.state, popupId: popupId.value, popupOpen: true }
            history.pushState(state, '', location.href)
          }

          historyPushed.value = true
          window.addEventListener('popstate', handlePopState)
        }
      } else {
        window.removeEventListener('popstate', handlePopState)
        // 手动关闭或浏览器回退时：从栈中移除
        const idx = popupStack.indexOf(popupId.value)
        if (idx !== -1) popupStack.splice(idx, 1)

        if (historyPushed.value) {
          // 只有在相同路由时才回退
          if (route.fullPath === popupPath.value) {
            // 只有当当前历史状态确实是 popupOpen 时才回退 (防止双重回退)
            // 兼容接管状态 (popupId可能不匹配但popupOpen为true) 和 推送状态
            if (history.state?.popupOpen) {
              history.back()
            }
          }
          historyPushed.value = false
        }
      }
    },
    { immediate: true },
  )

  const cleanup = () => {
    window.removeEventListener('popstate', handlePopState)
    const idx = popupStack.indexOf(popupId.value)
    if (idx !== -1) popupStack.splice(idx, 1)

    if (historyPushed.value) {
      if (route.fullPath === popupPath.value) {
        if (history.state?.popupOpen) {
          history.back()
        }
      }
      historyPushed.value = false
      // 强制关闭弹窗，确保状态复位
      show.value = false
    }
  }

  onUnmounted(cleanup)
  onDeactivated(cleanup)

  /**
   * 安全关闭弹窗并等待历史记录回退完成
   * 用于在关闭当前弹窗后立即打开新弹窗的场景，防止冲突
   */
  const close = () => {
    show.value = false
    return new Promise<void>((resolve) => setTimeout(resolve, 100))
  }

  return { close }
}
