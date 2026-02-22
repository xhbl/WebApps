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
  const hasRestored = ref(false) // 新增：标记是否已完成恢复
  const openPath = ref(route.path)

  const saveState = () => {
    // 只有在弹窗显示且不在恢复过程中才保存
    if (isRestoring.value || !show.value) return
    const state = {
      ...getState(),
      _timestamp: Date.now(),
      _show: true,
      _routePath: route.path,
    }
    localStorage.setItem(storageKey, JSON.stringify(state))
  }

  const clearDraft = () => {
    // 关键修复：如果正在恢复状态，绝对不要清除草稿
    if (isRestoring.value) return
    localStorage.removeItem(storageKey)
  }

  // 监听显示状态：打开时立即保存（更新时间戳），关闭时自动清除
  watch(show, (v) => {
    if (v) {
      openPath.value = route.path
      saveState()
      // 手动打开也视为已恢复/已激活，防止后续路由变化误判
      hasRestored.value = true
    } else {
      clearDraft()
    }
  })

  // 监听数据源变化自动保存
  if (watchSource) {
    watch(watchSource, saveState, { deep: true })
  }

  // 尝试恢复草稿的核心逻辑
  const checkAndRestore = async () => {
    if (hasRestored.value || isRestoring.value) return

    const saved = localStorage.getItem(storageKey)
    if (!saved) return

    try {
      const state = JSON.parse(saved)

      // 路径归一化处理 (移除末尾斜杠进行比较)
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

        // 3. 等待 DOM 更新
        await nextTick()

        // 4. 恢复数据
        await restoreState(state)

        // 5. 再次等待，确保所有 watch 副作用完成
        await nextTick()

        // 6. 结束恢复
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

  onMounted(() => {
    checkAndRestore()
  })

  return {
    isRestoring,
    saveState,
    clearDraft,
  }
}
