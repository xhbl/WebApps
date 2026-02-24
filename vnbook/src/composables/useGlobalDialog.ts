import { useDialogStore, type DialogOptions } from '@/stores/dialog'

/**
 * 显示全局确认对话框（支持物理返回键关闭）
 * @param options 弹窗配置
 * @returns Promise<boolean> 确认resolve，取消reject
 */
export function showGlobalDialog(options: DialogOptions): Promise<boolean | { checked: boolean }> {
  const store = useDialogStore()
  return store.open(options) as Promise<boolean | { checked: boolean }>
}

/**
 * 显示输入对话框（用于密码验证等场景）
 * @param options 弹窗配置
 * @returns Promise<string> 确认时返回输入值，取消时reject
 */
export function showPromptDialog(options: Omit<DialogOptions, 'showInput'>): Promise<string> {
  const store = useDialogStore()
  return store.open({ ...options, showInput: true }) as Promise<string>
}
