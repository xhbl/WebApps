import { useDialogStore, type DialogOptions } from '@/stores/dialog'

/**
 * 显示全局确认对话框（支持物理返回键关闭）
 * @param options 弹窗配置
 * @returns Promise<boolean> 确认resolve，取消reject
 */
export function showGlobalDialog(options: DialogOptions): Promise<boolean | { checked: boolean }> {
  const store = useDialogStore()
  return store.open(options)
}
