import { watch, onUnmounted, onDeactivated, ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 弹窗历史记录管理 Hook
 * 在弹窗打开时推送一条历史记录，确保点击浏览器返回键时只关闭弹窗而不回退页面
 */
export function usePopupHistory(show: Ref<boolean>) {
  const route = useRoute()
  const historyPushed = ref(false)
  const popupPath = ref('')

  const handlePopState = () => {
    if (show.value) {
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

          // 总是推入新的历史记录，以支持嵌套弹窗（如：编辑弹窗 -> 删除确认框）
          // 如果不推入，关闭上层弹窗时会错误地回退到底层弹窗的历史记录
          const state = { ...history.state, popupOpen: true }
          history.pushState(state, '', location.href)

          historyPushed.value = true
          window.addEventListener('popstate', handlePopState)
        }
      } else {
        window.removeEventListener('popstate', handlePopState)
        if (historyPushed.value) {
          history.back()
          historyPushed.value = false
        }
      }
    },
    { immediate: true },
  )

  const cleanup = () => {
    window.removeEventListener('popstate', handlePopState)
    if (historyPushed.value) {
      // 只有当当前路由路径与打开弹窗时一致时，才执行回退
      // 如果路由变了（例如用户点击了退出登录跳转到 /login），則不回退，以免抵消路由跳转
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
