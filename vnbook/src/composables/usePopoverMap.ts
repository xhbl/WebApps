import { ref } from 'vue'

export function usePopoverMap() {
  const popoverMap = ref<Record<string | number, boolean>>({})

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

  return { popoverMap, onOpen, closeAll }
}
