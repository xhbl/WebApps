// 导出 WordsStore 类型，便于组件类型断言
export type WordsStore = ReturnType<typeof useWordsStore>
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as wordsApi from '@/api/words'
import type { Word, Explanation, Sentence, SortMode, GroupedWords } from '@/types'
import { toast } from '@/utils/toast'
import { showDialog } from 'vant'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'

function defineWordsStore() {
  const authStore = useAuthStore()
  // State
  /**
   * 当前单词本的单词列表（已由接口按 bookId 过滤）
   */
  const words = ref<Word[]>([])
  const currentWord = ref<Word | null>(null)
  const searchKeyword = ref('')
  const orphanFilter = ref(false)
  const savedSortMode = authStore.userInfo?.cfg?.wordsListSortMode
  const sortMode = ref<SortMode>(savedSortMode === 'alpha' ? 'alpha' : 'date')

  // Getters
  /**
   * 过滤后的单词列表
   */
  const filteredWords = computed(() => {
    let result = words.value
    if (orphanFilter.value) {
      result = result.filter((w) => (w.book_count || 0) === 0)
    }
    if (!searchKeyword.value) return result
    const k = searchKeyword.value.toLowerCase()
    return result.filter((w) => w.word.toLowerCase().includes(k))
  })

  /**
   * 分组后的单词列表
   */
  const groupedWords = computed<GroupedWords[]>(() => {
    if (filteredWords.value.length === 0) return []

    if (sortMode.value === 'date') {
      // 按日期分组
      const groups = new Map<string, Word[]>()

      filteredWords.value.forEach((word) => {
        const date = word.time_c?.split(' ')[0] || '' // 提取日期部分
        if (date && !groups.has(date)) {
          groups.set(date, [])
        }
        if (date) {
          groups.get(date)!.push(word)
        }
      })

      return Array.from(groups.entries()).map(([date, words]) => ({
        key: date,
        label: date,
        words,
      }))
    } else {
      // 按字母分组
      const groups = new Map<string, Word[]>()

      filteredWords.value.forEach((word) => {
        const letter = word.word.charAt(0).toUpperCase()
        if (!groups.has(letter)) {
          groups.set(letter, [])
        }
        groups.get(letter)!.push(word)
      })

      // 按字母顺序排序
      const sortedEntries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))

      return sortedEntries.map(([letter, words]) => ({
        key: letter,
        label: letter,
        words,
      }))
    }
  })

  // Actions
  /**
   * 加载单词列表
   */
  const loadWords = async (bookId: number) => {
    try {
      const response = await wordsApi.getWords(bookId)
      if (response.data.success === true && response.data.word) {
        words.value = response.data.word.map((w: unknown) => {
          const word = w as Word & { explanations?: unknown[] }
          return {
            id: Number(word.id),
            word: word.word,
            phon: word.phon,
            time_c: word.time_c,
            book_count: Number(word.book_count || 0),
            _new: word._new,
            explanations: (word.explanations || []).map((e) => {
              const exp = e as Explanation & { sentences?: unknown[] }
              return {
                id: Number(exp.id),
                word_id: Number(exp.word_id),
                pos: exp.pos,
                exp: typeof exp.exp === 'string' ? JSON.parse(exp.exp) : exp.exp,
                time_c: exp.time_c,
                _new: exp._new,
                sentences: (exp.sentences || []).map((s) => {
                  const sen = s as Sentence
                  return {
                    id: Number(sen.id),
                    exp_id: Number(sen.exp_id),
                    sen: typeof sen.sen === 'string' ? JSON.parse(sen.sen) : sen.sen,
                    time_c: sen.time_c,
                    _new: sen._new,
                  }
                }),
              }
            }),
          }
        })

        // 按排序模式排序
        sortWords()
        return true
      }
      return false
    } catch (error) {
      console.error('Load words failed:', error)
      return false
    }
  }

  /**
   * 检查单词是否存在（全局）
   */
  const checkWordExistence = async (wordText: string) => {
    try {
      // bid=0 means search globally
      const response = await wordsApi.getWords(0, wordText)
      if (response.data.success === true && response.data.word && response.data.word.length > 0) {
        const w = response.data.word[0]
        if (!w) return null
        // Parse explanations if needed, similar to loadWords
        const word: Word = {
          id: Number(w.id),
          word: w.word,
          phon: w.phon,
          time_c: w.time_c,
          book_count: Number(w.book_count || 0),
          _new: w._new,
          explanations: (w.explanations || []).map((e) => ({
            id: Number(e.id),
            word_id: Number(e.word_id),
            pos: e.pos,
            exp: typeof e.exp === 'string' ? JSON.parse(e.exp) : e.exp,
            time_c: e.time_c,
            _new: e._new,
          })),
        }
        return word
      }
      return null
    } catch (error) {
      console.error('Check word existence failed:', error)
      return null
    }
  }

  /**
   * 排序单词
   */
  const sortWords = () => {
    if (sortMode.value === 'date') {
      // 按时间倒序
      words.value.sort((a, b) => b.time_c.localeCompare(a.time_c))
    } else {
      // 按字母顺序
      words.value.sort((a, b) => a.word.localeCompare(b.word))
    }
  }

  /**
   * 设置搜索关键字
   */
  const setSearchKeyword = (k: string) => {
    searchKeyword.value = k
  }

  /**
   * 切换孤儿单词过滤模式
   */
  const toggleOrphanFilter = () => {
    orphanFilter.value = !orphanFilter.value
  }

  /**
   * 切换排序模式
   */
  const toggleSortMode = () => {
    sortMode.value = sortMode.value === 'date' ? 'alpha' : 'date'
    authStore.updateUserConfig({ wordsListSortMode: sortMode.value })
    sortWords()
  }
  const saveWord = async (word: Word, bookId?: number) => {
    try {
      // 由 API 层处理 bid 传递
      const booksStore = useBooksStore()
      const book_id = bookId ?? booksStore.currentBook?.id
      const response = await wordsApi.saveWord({ ...word, book_id })
      if (response.data.success === true && response.data.word && response.data.word[0]) {
        const savedWord = response.data.word[0]

        // 检查是否需要二次确认
        if (savedWord?._new === 2) {
          // 单词已存在于其他单词本中
          const confirmed = await showDialog({
            title: '单词已存在',
            message: `单词"${savedWord.word}"已存在于其他单词本中，要加入此单词本吗？`,
          })

          if (confirmed && savedWord) {
            // 第二次提交，只添加映射关系
            return await saveWord(savedWord, bookId)
          }
          return null
        }

        if (word._new === 1) {
          // 新增
          words.value.push(savedWord)
          sortWords()
          toast.showSuccess('添加成功')

          // 更新单词本数量
          const booksStore = useBooksStore()
          if (booksStore.currentBook) {
            booksStore.updateBookNums(booksStore.currentBook.id, booksStore.currentBook.nums + 1)
          }
        } else {
          // 更新
          const index = words.value.findIndex((w) => w.id === savedWord?.id)
          if (index !== -1 && words.value[index]) {
            // 保留 explanations
            savedWord.explanations = words.value[index]?.explanations
            words.value[index] = savedWord
          }
          toast.showSuccess('更新成功')
        }

        return savedWord
      }
      return null
    } catch (error) {
      console.error('Save word failed:', error)
      return null
    }
  }

  /**
   * 批量删除/移除单词
   */
  const deleteWords = async (targetWords: Word[], bookId: number) => {
    try {
      // 直接调用 API，确保支持批量删除和传递 bookId
      const response = await fetch(`/api/words.php?req=w&bid=${bookId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetWords),
      })
      const res = await response.json()
      if (!res.success) throw new Error(res.message)

      // 从列表中移除
      const targetIds = new Set(targetWords.map((w) => w.id))
      words.value = words.value.filter((w) => !targetIds.has(w.id))

      // 如果当前查看的单词被删除了，重置 currentWord
      if (currentWord.value && targetIds.has(currentWord.value.id)) {
        currentWord.value = null
      }

      // 更新单词本数量
      const booksStore = useBooksStore()
      if (booksStore.currentBook) {
        const newCount = Math.max(0, booksStore.currentBook.nums - targetWords.length)
        booksStore.updateBookNums(booksStore.currentBook.id, newCount)
      }

      const isAllWords = bookId === 0
      toast.showSuccess(isAllWords ? '删除成功' : '移除成功')
      return true
    } catch (error) {
      console.error('Delete words failed:', error)
      return false
    }
  }

  /**
   * 更新单词音标
   */
  const updatePhon = async (wordId: number, phon: string) => {
    try {
      await wordsApi.updateWordPhon(wordId, phon)

      const word = words.value.find((w) => w.id === wordId)
      if (word) {
        word.phon = phon
      }
      if (currentWord.value?.id === wordId) {
        currentWord.value.phon = phon
      }

      toast.showSuccess('更新成功')
      return true
    } catch (error) {
      console.error('Update phon failed:', error)
      return false
    }
  }

  /**
   * 保存释义
   */
  const saveExplanation = async (explanation: Explanation) => {
    try {
      const response = await wordsApi.saveExplanation(explanation)
      if (
        response.data.success === true &&
        response.data.word &&
        response.data.word[0]?.explanations?.[0]
      ) {
        const savedExp = response.data.word[0].explanations![0]

        // 更新当前单词的释义列表
        if (currentWord.value && currentWord.value.id === explanation.word_id) {
          if (!currentWord.value.explanations) {
            currentWord.value.explanations = []
          }

          if (explanation._new === 1 && savedExp) {
            currentWord.value.explanations.push(savedExp)
            toast.showSuccess('添加成功')
          } else if (savedExp) {
            const index = currentWord.value.explanations!.findIndex((e) => e.id === savedExp.id)
            if (index !== -1 && currentWord.value.explanations) {
              // 保留 sentences
              savedExp.sentences = currentWord.value.explanations[index]?.sentences
              currentWord.value.explanations[index] = savedExp
            }
            toast.showSuccess('更新成功')
          }

          // 同步到 words 列表
          const word = words.value.find((w) => w.id === explanation.word_id)
          if (word) {
            word.explanations = currentWord.value.explanations
          }
        }

        return savedExp
      }
      return null
    } catch (error) {
      console.error('Save explanation failed:', error)
      return null
    }
  }

  /**
   * 删除释义
   */
  const deleteExplanation = async (explanation: Explanation) => {
    try {
      const confirmed = await showDialog({
        title: '确认删除',
        message: '确定要删除这条释义吗？',
      })

      if (!confirmed) return false

      await wordsApi.deleteExplanation(explanation)

      // 从当前单词的释义列表中移除
      if (currentWord.value && currentWord.value.explanations) {
        const index = currentWord.value.explanations.findIndex((e) => e.id === explanation.id)
        if (index !== -1) {
          currentWord.value.explanations.splice(index, 1)
        }

        // 同步到 words 列表
        const word = words.value.find((w) => w.id === explanation.word_id)
        if (word) {
          word.explanations = currentWord.value.explanations
        }
      }

      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      console.error('Delete explanation failed:', error)
      return false
    }
  }

  /**
   * 保存例句
   */
  const saveSentence = async (sentence: Sentence, expId: number) => {
    try {
      const response = await wordsApi.saveSentence(sentence)
      if (
        response.data.success === true &&
        response.data.word &&
        response.data.word[0]?.explanations?.[0]?.sentences?.[0]
      ) {
        const savedSen = response.data.word[0].explanations![0].sentences![0]

        // 同步到 words 列表
        const word = words.value.find((w) => w.id === currentWord.value?.id)
        if (word && word.explanations) {
          const wordExp = word.explanations.find((e) => e.id === expId)
          if (wordExp) {
            // 这里假设 exp.sentences 已经在上层同步
            if (currentWord.value) {
              const exp = currentWord.value.explanations?.find((e) => e.id === expId)
              if (exp) {
                wordExp.sentences = exp.sentences
              }
            }
          }
        }
        return savedSen
      }
      return null
    } catch (error) {
      console.error('Save sentence failed:', error)
      return null
    }
  }

  /**
   * 删除例句
   */
  const deleteSentence = async (sentence: Sentence, expId: number) => {
    try {
      const confirmed = await showDialog({
        title: '确认删除',
        message: '确定要删除这条例句吗？',
      })

      if (!confirmed) return false

      await wordsApi.deleteSentence(sentence)

      // 从释义的例句列表中移除
      if (currentWord.value && currentWord.value.explanations) {
        const exp = currentWord.value.explanations.find((e) => e.id === expId)
        if (exp && exp.sentences) {
          const index = exp.sentences.findIndex((s) => s.id === sentence.id)
          if (index !== -1) {
            exp.sentences.splice(index, 1)
          }

          // 同步 words 列表
          const word = words.value.find((w) => w.id === currentWord.value!.id)
          if (word && word.explanations) {
            const wordExp = word.explanations.find((e) => e.id === expId)
            if (wordExp) {
              wordExp.sentences = exp.sentences
            }
          }
        }
      }

      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      console.error('Delete sentence failed:', error)
      return false
    }
  }

  /**
   * 设置当前单词
   */
  const setCurrentWord = (word: Word | null) => {
    currentWord.value = word
  }

  /**
   * 根据单词名查找单词（本地）
   */
  const findWordByName = (name: string): Word | undefined => {
    return words.value.find((w) => w.word.toLowerCase() === name.toLowerCase())
  }

  /**
   * 清空单词列表
   */
  const clearWords = () => {
    words.value = []
    currentWord.value = null
    searchKeyword.value = ''
    orphanFilter.value = false
  }

  return {
    words,
    currentWord,
    sortMode,
    groupedWords,
    searchKeyword,
    orphanFilter,
    filteredWords,
    loadWords,
    sortWords,
    toggleSortMode,
    saveWord,
    deleteWords,
    updatePhon,
    saveExplanation,
    deleteExplanation,
    saveSentence,
    deleteSentence,
    setCurrentWord,
    setSearchKeyword,
    findWordByName,
    clearWords,
    toggleOrphanFilter,
    checkWordExistence,
  }
}

export const useWordsStore = defineStore('words', defineWordsStore)
