import { toast } from '@/utils/toast'
import { useWordsStore } from '@/stores/words'
import { useBooksStore } from '@/stores/books'
import { showGlobalDialog } from '@/composables/useGlobalDialog'
import { usePopupHistory } from '@/composables/usePopupHistory'
import { ref, computed } from 'vue'
import type { Word, Explanation, Sentence } from '@/types'

export function useWordOperations() {
  const wordsStore = useWordsStore()
  const booksStore = useBooksStore()

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
          if (success) toast.showSuccess('已添加到复习本')
        }
      } else {
        success = await wordsStore.batchAddToReview(targetList, true)
        // 批量操作的成功由 store 处理，但如果需要我们可以显示一个 toast
        // store 可能不会显示批量添加的 toast，检查 words.ts...
        // words.ts batchAddToReview 调用 API 并返回布尔值。
        if (success) toast.showSuccess(`已将 ${targetList.length} 个单词添加到复习本`)
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
        toast.showSuccess('移除成功')
      }
      return success
    } catch {
      return false
    }
  }

  /**
   * 删除单词逻辑
   */
  const handleDelete = async (targets: Word | Word[], bid: number) => {
    const targetList = Array.isArray(targets) ? targets : [targets]
    if (targetList.length === 0) return false

    const isAllWords = bid === 0
    const isBatch = targetList.length > 1

    try {
      if (isAllWords) {
        // 全部单词模式：物理删除
        // 检查是否有单词被其他单词本收录
        const linkedWordsCount = targetList.filter((w) => (w.book_count || 0) > 0).length

        if (linkedWordsCount > 0) {
          // 第一步确认：提示关联信息
          const msg = isBatch
            ? `所选单词中有 ${linkedWordsCount} 个已被单词本收录，确认要删除吗？`
            : `此单词已在 ${targetList[0]?.book_count} 个单词本中收录，确认要删除吗？`

          await showGlobalDialog({
            title: '确认删除',
            message: msg,
            confirmButtonText: '下一步',
            confirmButtonColor: 'var(--van-danger-color)',
            showCancelButton: true,
          })
        }

        // 第二步（或直接）确认：永久删除提示
        const deleteMsg = isBatch
          ? `删除后将无法恢复，确认删除所选 ${targetList.length} 个单词吗？`
          : `删除后将无法恢复，确认删除单词"${targetList[0]?.word}"吗？`

        await showGlobalDialog({
          title: '永久删除',
          message: deleteMsg,
          confirmButtonText: '删除',
          confirmButtonColor: 'var(--van-danger-color)',
          showCancelButton: true,
        })

        const success = await wordsStore.deleteWords(targetList, bid)
        return success
      } else {
        // 单词本模式：带选项的删除
        const msg = isBatch
          ? `确定从当前单词本中删除所选 ${targetList.length} 个单词吗？`
          : `确定从当前单词本中删除单词"${targetList[0]?.word}"吗？`

        const result = await showGlobalDialog({
          title: '删除单词',
          message: msg,
          confirmButtonText: '删除',
          confirmButtonColor: 'var(--van-danger-color)',
          showCancelButton: true,
          showCheckbox: true,
          checkboxLabel: '同时删除单词本身（若被其他单词本收录则保留）',
        })

        const deleteOrphans = typeof result === 'object' ? result.checked : false
        // 这里必须传递 deleteOrphans 给 store
        const success = await wordsStore.deleteWords(targetList, bid, false, deleteOrphans)
        return success
      }
    } catch {
      return false
    }
  }

  // --- 移动功能逻辑 ---
  const showMoveSheet = ref(false)
  const pendingMoveWords = ref<Word[]>([])
  const currentBid = ref(0)
  let onMoveSuccessCallback: (() => void) | null = null

  const { close: closeMoveSheet } = usePopupHistory(showMoveSheet)

  const moveTargetOptions = computed(() => {
    // 过滤掉当前单词本
    return booksStore.books
      .filter((b) => b.id !== currentBid.value)
      .map((b) => ({
        name: `${b.title} (${b.nums}词)`,
        value: b.id,
      }))
  })

  const handleMove = (targets: Word | Word[], bid: number, onSuccess?: () => void) => {
    const targetList = Array.isArray(targets) ? targets : [targets]
    if (targetList.length === 0) return

    currentBid.value = bid
    if (moveTargetOptions.value.length === 0) {
      showGlobalDialog({ message: '没有可以移动的目标单词本', showCancelButton: false })
      return
    }
    pendingMoveWords.value = targetList
    onMoveSuccessCallback = onSuccess || null
    showMoveSheet.value = true
  }

  const onMoveConfirm = async (action: { name: string; value: number }) => {
    // 安全关闭并等待
    await closeMoveSheet()

    const targetBookId = action.value
    const targets = pendingMoveWords.value
    const isBatch = targets.length > 1
    const isAdd = currentBid.value === 0
    const actionText = isAdd ? '添加' : '移动'

    try {
      await showGlobalDialog({
        title: `确认${actionText}`,
        message: `确定将 ${isBatch ? `所选 ${targets.length} 个单词` : `单词"${targets[0]?.word}"`} ${actionText}到 "${action.name}" 吗？`,
        confirmButtonText: actionText,
        confirmButtonColor: 'var(--van-primary-color)',
        showCancelButton: true,
      })

      await wordsStore.moveWords(targets, targetBookId, currentBid.value, `${actionText}成功`)

      if (onMoveSuccessCallback) {
        onMoveSuccessCallback()
      }
    } catch {}
  }

  // --- 编辑/添加功能逻辑 ---
  const showWordEditor = ref(false)
  const editingWord = ref<Word | null>(null)

  const openAddWord = () => {
    editingWord.value = null
    showWordEditor.value = true
  }

  const openEditWord = (word: Word) => {
    editingWord.value = word
    showWordEditor.value = true
  }

  /**
   * 保存单词逻辑
   * 处理新建、更新以及“单词已存在于其他本”的关联逻辑
   */
  const handleSaveWord = async (
    wordData: Word,
    bid: number,
    addToReview: boolean,
    isNewMode: boolean,
  ) => {
    // 尝试保存
    const saved = await wordsStore.saveWord(wordData, bid, addToReview)

    if (!saved && addToReview) {
      toast.showFail('保存失败')
      return false
    }

    // 处理单词已存在的情况 (_new === 2)
    if (saved && saved._new === 2) {
      try {
        const message =
          (saved.book_count || 0) > 0
            ? `单词"${saved.word}"已存在于其他单词本中，要加入此单词本吗？`
            : `单词"${saved.word}"是一个未入本单词，要加入此单词本吗？`
        await showGlobalDialog({
          title: '单词已存在',
          message,
          showCancelButton: true,
        })
        // 用户确认后，再次调用 saveWord（此时传入的对象 _new 为 2，后端会执行关联操作）
        const retrySaved = await wordsStore.saveWord(saved, bid, addToReview)
        if (retrySaved) {
          if (addToReview) {
            const reviewSuccess = await wordsStore.addToReview(retrySaved, true)
            if (reviewSuccess) {
              toast.showSuccess('添加成功并加入复习本')
            } else {
              toast.showSuccess('添加成功，但加入复习本失败')
            }
          } else {
            // 如果没有勾选加入复习本，且 saveWord 是 silent=false (默认)，store 已显示 toast
            // 如果 saveWord 是 silent=true (这里是 addToReview.value 为 false)，则 store 显示 toast
          }
          return true
        }
        return false
      } catch {
        // 用户取消，不做操作
        return false
      }
    }

    if (saved) {
      if (addToReview) {
        const reviewSuccess = await wordsStore.addToReview(saved, true)
        const actionText = isNewMode ? '添加' : '更新'
        if (reviewSuccess) {
          toast.showSuccess(`${actionText}成功并加入复习本`)
        } else {
          toast.showSuccess(`${actionText}成功，但加入复习本失败`)
        }
      }
      return true
    }

    return false
  }

  // --- 释义操作逻辑 ---
  const showExpEditor = ref(false)
  const editingExp = ref<Explanation | null>(null)

  const openAddExp = (wordId: number) => {
    editingExp.value = {
      id: 0,
      word_id: wordId,
      pos: '',
      exp: { en: '', zh: '' },
      time_c: '',
      _new: 1,
      lid: 0,
      exp_ch: '',
      abbr: '',
      hide: 0,
      sorder: 0,
    }
    showExpEditor.value = true
  }

  const openEditExp = (exp: Explanation) => {
    editingExp.value = exp
    showExpEditor.value = true
  }

  const handleSaveExp = async (expData: Explanation) => {
    return await wordsStore.saveExplanation(expData)
  }

  const handleDeleteExp = async (exp: Explanation) => {
    try {
      await showGlobalDialog({
        title: '删除释义',
        message: '确定要删除这条释义及其下的所有例句吗？此操作不可恢复。',
        showCancelButton: true,
        confirmButtonColor: 'var(--van-danger-color)',
      })
      return await wordsStore.deleteExplanation(exp)
    } catch {
      return false
    }
  }

  const handleMoveExp = async (wordId: number, expId: number, direction: number) => {
    return await wordsStore.moveExplanation(wordId, expId, direction)
  }

  // --- 例句操作逻辑 ---
  const showSenEditor = ref(false)
  const editingSen = ref<Sentence | null>(null)

  const openAddSen = (expId: number) => {
    editingSen.value = {
      id: 0,
      exp_id: expId,
      sen: { en: '', zh: '' },
      time_c: '',
      _new: 1,
      smemo: '',
      hide: 0,
      sorder: 0,
    }
    showSenEditor.value = true
  }

  const openEditSen = (sen: Sentence) => {
    editingSen.value = sen
    showSenEditor.value = true
  }

  const handleSaveSen = async (senData: Sentence, expId: number) => {
    return await wordsStore.saveSentence(senData, expId)
  }

  const handleDeleteSen = async (sen: Sentence, expId: number) => {
    try {
      await showGlobalDialog({
        title: '删除例句',
        message: '确定要删除这条例句吗？此操作不可恢复。',
        showCancelButton: true,
        confirmButtonColor: 'var(--van-danger-color)',
      })
      return await wordsStore.deleteSentence(sen, expId)
    } catch {
      return false
    }
  }

  const handleMoveSen = async (expId: number, senId: number, direction: number) => {
    return await wordsStore.moveSentence(expId, senId, direction)
  }

  return {
    handleAddToReview,
    handleRemoveFromReview,
    handleDelete,
    handleMove,
    // 移动相关状态
    showMoveSheet,
    moveTargetOptions,
    onMoveConfirm,
    closeMoveSheet,

    // 编辑/添加相关
    showWordEditor,
    editingWord,
    openAddWord,
    openEditWord,
    handleSaveWord,

    // 释义相关
    showExpEditor,
    editingExp,
    openAddExp,
    openEditExp,
    handleSaveExp,
    handleDeleteExp,
    handleMoveExp,

    // 例句相关
    showSenEditor,
    editingSen,
    openAddSen,
    openEditSen,
    handleSaveSen,
    handleDeleteSen,
    handleMoveSen,
  }
}
