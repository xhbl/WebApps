import { showToast, closeToast } from 'vant'

/**
 * 智能 Toast 工具类
 * - Loading 防抖：200ms 内完成的请求不显示 loading
 * - 统一样式：所有 toast 黑底白字
 * - 防重复提交支持
 */
class SmartToast {
  private loadingTimer: number | null = null
  private readonly DEBOUNCE_DELAY = 200 // 固定 200ms 防抖

  /**
   * 显示 Loading Toast（带防抖）
   * 如果请求在 200ms 内完成，则不会显示
   */
  showLoading(message = '') {
    this.hideLoading()

    // 延迟 200ms 后才显示 loading
    const timerId = window.setTimeout(() => {
      if (this.loadingTimer !== timerId) return

      showToast({
        type: 'loading',
        message, // 空字符串则只显示 spinner
        forbidClick: true,
        duration: 0,
        className: 'custom-toast',
      })
    }, this.DEBOUNCE_DELAY)
    this.loadingTimer = timerId
  }

  /**
   * 隐藏 Loading Toast
   */
  hideLoading() {
    // 清除防抖定时器
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer)
      this.loadingTimer = null
    }
    closeToast()
  }

  /**
   * 显示成功 Toast
   */
  showSuccess(message: string, duration = 1500) {
    this.hideLoading()
    showToast({
      type: 'success',
      message,
      duration,
      icon: 'success',
      className: 'custom-toast toast-success',
    })
  }

  /**
   * 显示失败 Toast
   */
  showFail(message: string, duration = 2000) {
    this.hideLoading()
    showToast({
      type: 'fail',
      message,
      duration,
      icon: 'cross',
      className: 'custom-toast toast-fail',
    })
  }

  /**
   * 显示普通 Toast
   */
  show(message: string, duration = 2000) {
    this.hideLoading()
    showToast({
      message,
      duration,
      className: 'custom-toast',
    })
  }
}

export const toast = new SmartToast()

/**
 * 防重复提交装饰器（用于按钮 loading 状态）
 */
export function useSubmitLoading() {
  const loading = ref(false)

  const withLoading = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (loading.value) return
    loading.value = true
    try {
      return await fn()
    } finally {
      loading.value = false
    }
  }

  return { loading, withLoading }
}

// Vue 3 ref 导入（如果在组件外使用需要导入）
import { ref } from 'vue'
