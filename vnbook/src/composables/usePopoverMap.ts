import { ref, onDeactivated, onUnmounted, onActivated, watch } from 'vue'
import { useRoute } from 'vue-router'

export function usePopoverMap() {
  const popoverMap = ref<Record<string | number, boolean>>({})
  const route = useRoute()

  const onOpen = (key: string | number) => {
    for (const k in popoverMap.value) {
      // 使用 String 比较以兼容数字 ID 和字符串 Key
      if (String(k) !== String(key)) {
        popoverMap.value[k] = false
      }
    }
    popoverMap.value[key] = true
  }

  const closeAll = () => {
    for (const k in popoverMap.value) {
      popoverMap.value[k] = false
    }
  }

  // 路由变化时强制关闭所有 Popover
  watch(
    () => route.fullPath,
    () => closeAll(),
  )

  // 自动在组件停用或卸载时关闭所有 Popover
  const cleanup = () => closeAll()
  onDeactivated(cleanup)
  onUnmounted(cleanup)
  onActivated(cleanup)

  return { popoverMap, onOpen, closeAll }
}
