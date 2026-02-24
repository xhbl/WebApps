import { ref } from 'vue'

// 全局滚动位置存储，按 key 区分不同页面
const scrollPositions = ref<Record<string, number>>({})

/**
 * 可复用的滚动位置管理 composable
 * @param key 唯一标识符，用于区分不同页面的滚动位置
 * @returns 返回滚动容器 ref 和滚动事件处理函数
 * 
 * @example
 * const { contentRef, onScroll } = useScrollPosition('UsersManage')
 * 
 * <div class="content" ref="contentRef" @scroll="onScroll">
 *   <!-- 滚动内容 -->
 * </div>
 */
export function useScrollPosition(key: string) {
  const contentRef = ref<HTMLElement | null>(null)

  // 实时保存滚动位置
  const onScroll = () => {
    if (contentRef.value) {
      scrollPositions.value[key] = contentRef.value.scrollTop
    }
  }

  // KeepAlive 恢复时恢复滚动位置
  const restoreScroll = () => {
    const savedPosition = scrollPositions.value[key] || 0
    if (contentRef.value && savedPosition > 0) {
      setTimeout(() => {
        if (contentRef.value) {
          contentRef.value.scrollTop = savedPosition
        }
      }, 0)
    }
  }

  // 在组件激活时恢复滚动
  // 注意：需要组件配合，调用 onActivated(restoreScroll) 或使用其他激活钩子
  // 这里返回 restoreScroll 函数，让组件自己决定何时调用

  return {
    contentRef,     // 需要在 template 中绑定: <div ref="contentRef" @scroll="onScroll">
    onScroll,       // 需要在 template 中绑定: @scroll="onScroll"
    restoreScroll,  // 需要在 onActivated 中调用: onActivated(() => restoreScroll())
  }
}

