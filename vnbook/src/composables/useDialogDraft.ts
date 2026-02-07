import { ref, watch, onMounted, nextTick, type Ref, type WatchSource } from 'vue'
import { useRoute } from 'vue-router'

export interface UseDialogDraftOptions<T> {
  /** 本地存储的 Key */
  storageKey: string
  /** 控制弹窗显示的 Ref */
  show: Ref<boolean>
  /** 需要监听自动保存的数据源 (Ref 或 Getter 数组) */
  watchSource?: WatchSource | WatchSource[] | object
  /** 获取需要保存的状态对象 */
  getState: () => T
  /** 恢复状态的回调函数 */
  restoreState: (state: T) => void | Promise<void>
  /** 有效期（毫秒），默认 24 小时 */
  validity?: number
}

export function useDialogDraft<T extends Record<string, unknown>>(
  options: UseDialogDraftOptions<T>,
) {
  const {
    storageKey,
    show,
    watchSource,
    getState,
    restoreState,
    validity = 24 * 60 * 60 * 1000,
  } = options

  const route = useRoute()
  const isRestoring = ref(false)

  const saveState = () => {
    // 只有在弹窗显示时才保存
    if (!show.value) return
    const state = {
      ...getState(),
      _timestamp: Date.now(),
      _show: true,
      _routePath: route.fullPath,
    }
    localStorage.setItem(storageKey, JSON.stringify(state))
  }

  const clearDraft = () => {
    localStorage.removeItem(storageKey)
  }

  // 监听显示状态：打开时立即保存（更新时间戳），关闭时不清除（除非手动调用 clearDraft）
  watch(show, (v) => {
    if (v) saveState()
  })

  // 监听数据源变化自动保存
  if (watchSource) {
    watch(watchSource, saveState, { deep: true })
  }

  // 监听路由变化：一旦离开当前 URL（导航、切书、切词），立即关闭并清除
  watch(
    () => route.fullPath,
    (newPath, oldPath) => {
      if (newPath !== oldPath && show.value) {
        show.value = false
        clearDraft()
      }
    },
  )

  onMounted(async () => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        // 核心校验：如果草稿记录的路径与当前路径不一致，视为上下文已变，强制清除
        if (state._routePath !== route.fullPath) {
          clearDraft()
          show.value = false
          return
        }
        // 检查有效期
        if (state._show && Date.now() - (state._timestamp || 0) < validity) {
          isRestoring.value = true

          // 1. 恢复显示状态 (这可能会触发组件内的 watch -> initForm)
          show.value = true

          // 2. 执行自定义恢复逻辑
          await restoreState(state)

          await nextTick()

          // 3. 延迟结束恢复状态，确保覆盖组件内的初始化副作用
          setTimeout(() => {
            isRestoring.value = false
          }, 100)
        }
      } catch (e) {
        console.error('Failed to restore draft', e)
        clearDraft()
      }
    }
  })

  return {
    isRestoring,
    saveState,
    clearDraft,
  }
}
