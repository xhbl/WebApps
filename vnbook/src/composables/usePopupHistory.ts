import { watch, onUnmounted, onDeactivated, ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'

// 全局栈：用于追踪当前活跃的弹窗 ID，解决嵌套弹窗的回退顺序问题
const popupStack: string[] = []

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

          const state = { ...history.state, popupId: popupId.value, popupOpen: true }
          history.pushState(state, '', location.href)
          historyPushed.value = true
          window.addEventListener('popstate', handlePopState)
        }
      } else {
        window.removeEventListener('popstate', handlePopState)
        if (historyPushed.value) {
          // 手动关闭时：从栈中移除，并回退历史
          const idx = popupStack.indexOf(popupId.value)
          if (idx !== -1) popupStack.splice(idx, 1)

          if (route.fullPath === popupPath.value) {
            history.back()
          }
          historyPushed.value = false
        }
      }
    },
    { immediate: true },
  )

  const cleanup = () => {
    window.removeEventListener('popstate', handlePopState)
    if (historyPushed.value) {
      const idx = popupStack.indexOf(popupId.value)
      if (idx !== -1) popupStack.splice(idx, 1)

      if (route.fullPath === popupPath.value) {
        history.back()
      }
      historyPushed.value = false
      // 强制关闭弹窗，确保状态复位
      show.value = false
    }
  }

  onUnmounted(cleanup)
  onDeactivated(cleanup)
}
