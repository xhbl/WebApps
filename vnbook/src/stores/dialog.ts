import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface DialogOptions {
  title?: string
  message?: string
  showCancelButton?: boolean
  showConfirmButton?: boolean
  confirmButtonText?: string
  confirmButtonColor?: string
  cancelButtonText?: string
  allowHtml?: boolean
  closeOnClickOverlay?: boolean
  width?: string | number
  messageAlign?: 'left' | 'center' | 'right'
  showCheckbox?: boolean
  checkboxLabel?: string
  checkboxChecked?: boolean
  showInput?: boolean
  inputPlaceholder?: string
  inputType?: string
}

export const useDialogStore = defineStore('dialog', () => {
  const show = ref(false)
  const checked = ref(false)
  const inputValue = ref('')
  const options = ref<DialogOptions>({})
  let resolveFn: ((value: boolean | { checked: boolean } | string) => void) | null = null
  let rejectFn: ((reason?: unknown) => void) | null = null
  let isSettled = false

  const open = (opts: DialogOptions) => {
    // 如果当前已有弹窗打开，先关闭它（视为取消）
    if (show.value && rejectFn && !isSettled) {
      rejectFn(new Error('interrupted'))
    }

    options.value = opts
    checked.value = !!opts.checkboxChecked
    inputValue.value = ''
    show.value = true
    isSettled = false

    return new Promise<boolean | { checked: boolean } | string>((resolve, reject) => {
      resolveFn = resolve
      rejectFn = reject
    })
  }

  const confirm = () => {
    if (isSettled) return
    isSettled = true
    show.value = false
    setTimeout(() => {
      if (resolveFn) {
        if (options.value.showInput) resolveFn(inputValue.value)
        else if (options.value.showCheckbox) resolveFn({ checked: checked.value })
        else resolveFn(true)
      }
    }, 100)
  }

  const cancel = () => {
    if (isSettled) return
    isSettled = true
    show.value = false
    setTimeout(() => {
      if (rejectFn) rejectFn(new Error('cancel'))
    }, 100)
  }

  // 当弹窗通过其他方式（如返回键、点击遮罩）关闭时调用
  const close = () => {
    if (isSettled) return
    isSettled = true
    show.value = false
    setTimeout(() => {
      // 纯提示对话框（无确认按钮）关闭时 resolve，否则 reject
      if (options.value.showConfirmButton === false) {
        if (resolveFn) resolveFn(true)
      } else {
        if (rejectFn) rejectFn(new Error('cancel'))
      }
    }, 100)
  }

  return { show, checked, inputValue, options, open, confirm, cancel, close }
})
