import { showToast } from 'vant'
import { useWordsStore } from '@/stores/words'
import { showGlobalDialog } from '@/composables/useGlobalDialog'
import type { Word } from '@/types'

export function useWordOperations() {
  const wordsStore = useWordsStore()

  /**
   * 将一个或多个单词添加到复习本。
   * 操作前会显示确认对话框。
   */
  const handleAddToReview = async (targets: Word | Word[]) => {
    const targetList = Array.isArray(targets) ? targets : [targets]
    if (targetList.length === 0) return false

    try {
      await showGlobalDialog({
        title: '加入复习',
        message: `确定将 ${targetList.length > 1 ? `所选 ${targetList.length} 个单词` : `单词"${targetList[0]?.word}"`} 加入复习本吗？`,
        confirmButtonText: '加入',
        confirmButtonColor: 'var(--van-primary-color)',
        showCancelButton: true,
      })

      let success = false
      if (targetList.length === 1) {
        const target = targetList[0]
        if (target) {
          success = await wordsStore.addToReview(target, true)
          if (success) showToast('已添加到复习本')
        }
      } else {
        success = await wordsStore.batchAddToReview(targetList, true)
        // 批量操作的成功由 store 处理，但如果需要我们可以显示一个 toast
        // store 可能不会显示批量添加的 toast，检查 words.ts...
        // words.ts batchAddToReview 调用 API 并返回布尔值。
        if (success) showToast(`已将 ${targetList.length} 个单词添加到复习本`)
      }
      return success
    } catch {
      // 取消或出错
      return false
    }
  }

  /**
   * 将一个或多个单词从复习本中移除。
   * 操作前会显示确认对话框。
   */
  const handleRemoveFromReview = async (targets: Word | Word[]) => {
    const targetList = Array.isArray(targets) ? targets : [targets]
    if (targetList.length === 0) return false

    try {
      await showGlobalDialog({
        title: '取消复习',
        message: `确定将 ${targetList.length > 1 ? `所选 ${targetList.length} 个单词` : `单词"${targetList[0]?.word}"`} 移出复习本吗？`,
        confirmButtonText: '移出',
        confirmButtonColor: 'var(--van-warning-color)',
        showCancelButton: true,
      })

      // 复习本 ID 是 -1
      // 我们传递 silent=true 给 deleteWords，这样我们可以在这里显示自定义的 toast 消息
      const success = await wordsStore.deleteWords(targetList, -1, true)
      if (success) {
        showToast('移出成功')
      }
      return success
    } catch {
      return false
    }
  }

  return {
    handleAddToReview,
    handleRemoveFromReview,
  }
}
