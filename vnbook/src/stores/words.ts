// 导出 WordsStore 类型，便于组件类型断言
export type WordsStore = ReturnType<typeof useWordsStore>
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as wordsApi from '@/api/words'
import type { Word, Explanation, Sentence, SortMode, GroupedWords } from '@/types'
import { toast } from '@/utils/toast'
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
  const currentBookId = ref<number | null>(null)
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

      // 按字母表顺序
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
      currentBookId.value = bookId
      // Initialize sort mode based on book type
      if (bookId === -1) {
        const saved = authStore.userInfo?.cfg?.reviewListSortMode as SortMode | undefined
        sortMode.value = saved || 'streak'
      } else {
        const saved = authStore.userInfo?.cfg?.wordsListSortMode as SortMode | undefined
        sortMode.value = saved || 'date'
      }

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
            n_known: word.n_known ? Number(word.n_known) : undefined,
            n_unknown: word.n_unknown ? Number(word.n_unknown) : undefined,
            n_streak: word.n_streak ? Number(word.n_streak) : undefined,
            time_r: word.time_r,
            explanations: (word.explanations || []).map((e) => {
              const exp = e as Explanation & { sentences?: unknown[] }
              return {
                id: Number(exp.id),
                word_id: Number(exp.word_id),
                pos: exp.pos,
                exp: typeof exp.exp === 'string' ? JSON.parse(exp.exp) : exp.exp,
                time_c: exp.time_c,
                _new: exp._new,
                sorder: Number(exp.sorder || 0),
                sentences: (exp.sentences || []).map((s) => {
                  const sen = s as Sentence
                  return {
                    id: Number(sen.id),
                    exp_id: Number(sen.exp_id),
                    sen:
                      typeof (sen.sen as unknown) === 'string'
                        ? JSON.parse(sen.sen as unknown as string)
                        : sen.sen,
                    time_c: sen.time_c,
                    _new: sen._new,
                    sorder: Number(sen.sorder || 0),
                    smemo: sen.smemo || '',
                  }
                }),
              }
            }),
            baseInfo: word.baseInfo,
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
          baseInfo: w.baseInfo,
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
    } else if (sortMode.value === 'streak') {
      // 按复习进度(连胜)升序
      words.value.sort((a, b) => (a.n_streak || 0) - (b.n_streak || 0))
    } else {
      // 按字母表顺序
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
    if (currentBookId.value === -1) {
      authStore.updateUserConfig({ reviewListSortMode: sortMode.value })
    } else {
      authStore.updateUserConfig({ wordsListSortMode: sortMode.value })
    }
    sortWords()
  }

  /**
   * 设置排序模式
   */
  const setSortMode = (mode: SortMode) => {
    sortMode.value = mode
    if (currentBookId.value === -1) {
      authStore.updateUserConfig({ reviewListSortMode: mode })
    } else {
      authStore.updateUserConfig({ wordsListSortMode: mode })
    }
    sortWords()
  }
  const saveWord = async (word: Word, bookId?: number, silent = false) => {
    try {
      // 由 API 层处理 bid 传递
      const booksStore = useBooksStore()
      const book_id = bookId ?? booksStore.currentBook?.id
      const response = await wordsApi.saveWord({ ...word, book_id })
      if (!response.data.success) {
        throw new Error(response.data.message || '保存失败')
      }
      if (response.data.success === true && response.data.word && response.data.word[0]) {
        const savedWord = response.data.word[0]

        // 确保 ID 为数字类型，防止前端比对失败或 Prop 类型警告
        if (savedWord) {
          savedWord.id = Number(savedWord.id)
          savedWord.book_count = Number(savedWord.book_count || 0)

          // 递归转换 explanations 及其 sentences 的 ID
          if (savedWord.explanations) {
            savedWord.explanations = savedWord.explanations.map((e: Explanation) => ({
              ...e,
              id: Number(e.id),
              word_id: Number(e.word_id),
              sorder: Number(e.sorder || 0),
              sentences: (e.sentences || []).map((s: Sentence) => ({
                ...s,
                id: Number(s.id),
                exp_id: Number(s.exp_id),
                sorder: Number(s.sorder || 0),
                // 确保 sen 字段是对象 (API 可能返回 JSON 对象，也可能需要解析)
                sen:
                  typeof (s.sen as unknown) === 'string'
                    ? JSON.parse(s.sen as unknown as string)
                    : s.sen,
              })),
            }))
          }
        }

        // 如果后端返回 _new=2，说明单词已存在，需要前端确认
        // 直接返回该对象，由 UI 层处理确认逻辑
        if (savedWord?._new === 2) {
          return savedWord
        }

        // 处理新增 (_new=1) 或 关联已有单词 (_new=2)
        if (word._new === 1 || word._new === 2) {
          // 检查列表里是否已存在（防止重复添加，例如在“全部单词”视图下）
          const existingIndex = words.value.findIndex((w) => w.id === savedWord.id)
          if (existingIndex === -1) {
            words.value.push(savedWord)
            sortWords()
            if (!silent) toast.showSuccess('添加成功')

            // 更新单词本数量
            const booksStore = useBooksStore()
            if (booksStore.currentBook) {
              booksStore.updateBookNums(booksStore.currentBook.id, booksStore.currentBook.nums + 1)
            }
          } else {
            // 如果列表里已有（例如在“全部单词”视图），则更新信息
            words.value[existingIndex] = savedWord
            if (!silent) toast.showSuccess('更新成功')
          }
        } else {
          // 更新
          const index = words.value.findIndex((w) => w.id === savedWord?.id)
          if (index !== -1 && words.value[index]) {
            // 保留 explanations
            savedWord.explanations = words.value[index]?.explanations
            words.value[index] = savedWord
          }
          if (!silent) toast.showSuccess('更新成功')
        }

        return savedWord
      }
      return null
    } catch (error) {
      console.error('Save word failed:', error)
      if (!silent) toast.showFail('保存失败')
      return null
    }
  }

  /**
   * 加入复习本
   */
  const addToReview = async (word: Word, silent = false) => {
    try {
      const response = await wordsApi.saveWord({ ...word, book_id: -1, _new: 1 })
      if (response.data.success) {
        if (!silent) toast.showSuccess('已加入复习本')
        // 更新本地状态，显示复习标记
        if (word.n_streak === undefined) {
          word.n_streak = 0
          word.n_known = 0
          word.n_unknown = 0
        }

        // 更新复习本计数
        const booksStore = useBooksStore()
        // 简单自增，保持 UI 同步
        booksStore.reviewCount++

        return true
      }
      if (!silent) toast.showFail('加入失败')
      return false
    } catch (error) {
      console.error('Add to review failed:', error)
      if (!silent) toast.showFail('操作失败')
      return false
    }
  }

  /**
   * 批量加入复习本
   */
  const batchAddToReview = async (targetWords: Word[]) => {
    try {
      // 复用 addWordsToBook 接口，传入 bid=-1
      const response = await wordsApi.addWordsToBook(-1, targetWords)
      if (response.data.success) {
        toast.showSuccess('已加入复习本')
        targetWords.forEach((w) => {
          if (w.n_streak === undefined) {
            w.n_streak = 0
            w.n_known = 0
            w.n_unknown = 0
          }
        })
        // 批量添加时，简单假设所有选中的都成功添加（或者后端返回实际添加数更好，这里做近似处理）
        // 由于 addWordsToBook 使用 INSERT IGNORE，重复的不会增加，但前端难以精确知道。
        // 这里暂不更新计数，或者重新加载 books。为了体验，重新加载 books 比较稳妥。
        const booksStore = useBooksStore()
        await booksStore.loadBooks()

        return true
      }
      toast.showFail('加入失败')
      return false
    } catch (error) {
      console.error('Batch add to review failed:', error)
      toast.showFail('操作失败')
      return false
    }
  }

  /**
   * 批量删除/移除单词
   */
  const deleteWords = async (targetWords: Word[], bookId: number, silent = false) => {
    try {
      // 使用封装的 API 调用，自动处理 baseURL 和 headers
      const response = await wordsApi.deleteWords(bookId, targetWords)
      if (!response.data.success) throw new Error(response.data.message)

      const targetIds = new Set(targetWords.map((w) => w.id))

      // 仅当当前视图与删除操作的 bookId 匹配时，才从列表中移除
      // 1. 普通单词本视图 (bid > 0) 且操作该本
      // 2. 复习本视图 (bid = -1) 且操作复习本
      // 3. 全部单词视图 (bid = 0) 且操作物理删除 (bookId = 0)
      if (currentBookId.value === bookId) {
        words.value = words.value.filter((w) => !targetIds.has(w.id))
      } else {
        // 如果是在其他视图（如全部单词）移出复习本，则更新单词状态
        if (bookId === -1) {
          targetWords.forEach((w) => {
            const wordInList = words.value.find((wl) => wl.id === w.id)
            if (wordInList) {
              wordInList.n_streak = undefined
              wordInList.n_known = undefined
              wordInList.n_unknown = undefined
            }
          })
        }
      }

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

      // 更新复习本计数
      if (bookId === -1) {
        booksStore.reviewCount = Math.max(0, booksStore.reviewCount - targetWords.length)
      }

      const isAllWords = bookId === 0
      if (!silent) toast.showSuccess(isAllWords ? '删除成功' : '移除成功')
      return true
    } catch (error) {
      console.error('Delete words failed:', error)
      const isAllWords = bookId === 0
      if (!silent) toast.showFail(isAllWords ? '删除失败' : '移除失败')
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
  const saveExplanation = async (explanation: Explanation, silent = false) => {
    try {
      const response = await wordsApi.saveExplanation(explanation)
      if (
        response.data.success === true &&
        response.data.explanation &&
        response.data.explanation.length > 0
      ) {
        const savedExp = response.data.explanation[0]
        if (!savedExp) return null

        // 确保 ID 为数字类型
        savedExp.id = Number(savedExp.id)
        savedExp.word_id = Number(savedExp.word_id)
        savedExp.sorder = Number(savedExp.sorder || 0)

        // 确保 exp 字段是对象 (API 可能返回 JSON 字符串)
        if (typeof (savedExp.exp as unknown) === 'string') {
          savedExp.exp = JSON.parse(savedExp.exp as unknown as string)
        }

        // 递归转换 sentences 的 ID
        if (savedExp.sentences) {
          savedExp.sentences = savedExp.sentences.map((s: Sentence) => ({
            ...s,
            id: Number(s.id),
            exp_id: Number(s.exp_id),
            sorder: Number(s.sorder || 0),
            sen:
              typeof (s.sen as unknown) === 'string'
                ? JSON.parse(s.sen as unknown as string)
                : s.sen,
            smemo: s.smemo || '',
          }))
        }

        // 定义通用更新逻辑
        const updateWordExplanations = (word: Word) => {
          if (!word.explanations) {
            word.explanations = []
          }

          if (explanation._new === 1) {
            // 防止重复添加 (处理双重提交或后端返回相同ID的情况)
            if (!word.explanations.some((e) => e.id === savedExp.id)) {
              word.explanations.unshift(savedExp)
            }
          } else {
            const index = word.explanations.findIndex((e) => e.id === savedExp.id)
            if (index !== -1) {
              // 保留 sentences
              savedExp.sentences = word.explanations[index]?.sentences
              word.explanations[index] = savedExp
            }
          }
        }

        // 1. 更新 currentWord
        if (currentWord.value && currentWord.value.id === explanation.word_id) {
          updateWordExplanations(currentWord.value)
        }

        // 2. 更新 words 列表 (如果 currentWord 为空或者与列表中的对象不是同一个引用)
        const wordInList = words.value.find((w) => w.id === explanation.word_id)
        if (wordInList && wordInList !== currentWord.value) {
          updateWordExplanations(wordInList)
        }

        if (!silent) toast.showSuccess(explanation._new === 1 ? '添加成功' : '更新成功')
        return savedExp
      }
      return null
    } catch (error) {
      console.error('Save explanation failed:', error)
    }
  }

  /**
   * 删除释义
   */
  const deleteExplanation = async (explanation: Explanation) => {
    try {
      await wordsApi.deleteExplanation(explanation)

      const removeExp = (explanations: Explanation[]) => {
        const index = explanations.findIndex((e) => e.id === explanation.id)
        if (index !== -1) {
          explanations.splice(index, 1)
        }
      }

      if (currentWord.value && currentWord.value.explanations) {
        removeExp(currentWord.value.explanations)
      }

      // 同步到 words 列表 (如果 currentWord 为空或者与列表中的对象不是同一个引用)
      const wordInList = words.value.find((w) => w.id === explanation.word_id)
      if (wordInList && wordInList !== currentWord.value && wordInList.explanations) {
        removeExp(wordInList.explanations)
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
  const saveSentence = async (sentence: Sentence, expId: number, silent = false) => {
    try {
      const response = await wordsApi.saveSentence(sentence)
      if (
        response.data.success === true &&
        response.data.sentence &&
        response.data.sentence.length > 0
      ) {
        const savedSen = response.data.sentence[0]
        if (!savedSen) return null

        // 确保 ID 为数字类型
        savedSen.id = Number(savedSen.id)
        savedSen.exp_id = Number(savedSen.exp_id)
        savedSen.sorder = Number(savedSen.sorder || 0)
        savedSen.smemo = savedSen.smemo || ''

        // 确保 sen 字段是对象 (API 可能返回 JSON 字符串)
        if (typeof (savedSen.sen as unknown) === 'string') {
          savedSen.sen = JSON.parse(savedSen.sen as unknown as string)
        }

        // 更新逻辑：同时更新 currentWord 和 words 列表中的数据
        const updateExpSentences = (explanations: Explanation[]) => {
          const exp = explanations.find((e) => e.id === expId)
          if (exp) {
            if (!exp.sentences) exp.sentences = []

            if (sentence._new === 1) {
              if (!exp.sentences.some((s) => s.id === savedSen.id)) {
                exp.sentences.unshift(savedSen)
              }
            } else {
              const index = exp.sentences.findIndex((s) => s.id === savedSen.id)
              if (index !== -1) {
                exp.sentences[index] = savedSen
              }
            }
          }
        }

        if (currentWord.value && currentWord.value.explanations) {
          updateExpSentences(currentWord.value.explanations)
        }

        // 2. 同步更新 words 列表 (如果 currentWord 与列表中的对象不是同一个引用)
        // 尝试在 words 列表中找到包含该 expId 的单词
        const wordInList = words.value.find((w) => w.explanations?.some((e) => e.id === expId))

        if (wordInList && wordInList !== currentWord.value && wordInList.explanations) {
          updateExpSentences(wordInList.explanations)
        }

        if (!silent) toast.showSuccess(sentence._new === 1 ? '添加成功' : '更新成功')
        return savedSen
      }
      if (!silent) toast.showFail('保存失败')
      return null
    } catch (error) {
      console.error('Save sentence failed:', error)
      if (!silent) toast.showFail('保存失败')
      return null
    }
  }

  /**
   * 删除例句
   */
  const deleteSentence = async (sentence: Sentence, expId: number) => {
    try {
      await wordsApi.deleteSentence(sentence)

      const removeSenFromExp = (explanations: Explanation[]) => {
        const exp = explanations.find((e) => e.id === expId)
        if (exp && exp.sentences) {
          const index = exp.sentences.findIndex((s) => s.id === sentence.id)
          if (index !== -1) {
            exp.sentences.splice(index, 1)
          }
        }
      }

      if (currentWord.value && currentWord.value.explanations) {
        removeSenFromExp(currentWord.value.explanations)
      }

      // 同步 words 列表 (如果 currentWord 为空或者与列表中的对象不是同一个引用)
      const wordInList = words.value.find((w) => w.explanations?.some((e) => e.id === expId))
      if (wordInList && wordInList !== currentWord.value && wordInList.explanations) {
        removeSenFromExp(wordInList.explanations)
      }

      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      console.error('Delete sentence failed:', error)
      return false
    }
  }

  /**
   * 移动释义（客户端）
   */
  const moveExplanation = async (wordId: number, expId: number, direction: number) => {
    const word = words.value.find((w) => w.id === wordId)
    if (!word || !word.explanations) return

    const index = word.explanations.findIndex((e) => e.id === expId)
    if (index === -1) return

    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= word.explanations.length) return

    // Swap elements
    const currentExp = word.explanations[index]!
    const targetExp = word.explanations[targetIndex]!

    word.explanations[index] = targetExp
    word.explanations[targetIndex] = currentExp

    // Update sorder and save
    const updates: Explanation[] = []
    word.explanations.forEach((e, idx) => {
      if (e.sorder !== idx) {
        e.sorder = idx
        updates.push(e)
      }
    })

    if (updates.length > 0) {
      await Promise.all(updates.map((e) => saveExplanation(e, true)))
    }
  }

  /**
   * 移动例句
   */
  const moveSentence = async (expId: number, senId: number, direction: number) => {
    // 查找释义对象 (优先从 currentWord 查找)
    let exp: Explanation | undefined
    if (currentWord.value && currentWord.value.explanations) {
      exp = currentWord.value.explanations.find((e) => e.id === expId)
    }
    if (!exp) {
      // 回退到全局查找
      for (const w of words.value) {
        if (w.explanations) {
          exp = w.explanations.find((e) => e.id === expId)
          if (exp) break
        }
      }
    }

    if (!exp || !exp.sentences) return

    const index = exp.sentences.findIndex((s) => s.id === senId)
    if (index === -1) return

    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= exp.sentences.length) return

    // Swap elements
    const currentSen = exp.sentences[index]!
    const targetSen = exp.sentences[targetIndex]!

    exp.sentences[index] = targetSen
    exp.sentences[targetIndex] = currentSen

    // Update sorder and save
    const updates: Sentence[] = []
    exp.sentences.forEach((s, idx) => {
      if (s.sorder !== idx) {
        s.sorder = idx
        updates.push(s)
      }
    })

    if (updates.length > 0) {
      await Promise.all(updates.map((s) => saveSentence(s, expId, true)))
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

  /**
   * 查询基础词典
   */
  const lookupDict = async (word: string) => {
    try {
      const response = await wordsApi.lookupBaseDict(word)
      if (response.data.success) {
        return response.data.data
      }
    } catch (e) {
      console.error('Lookup dict failed', e)
    }
    return null
  }

  /**
   * 获取单词所属的单词本
   */
  const getBelongingBooks = async (wordId: number) => {
    try {
      const response = await wordsApi.getWordBooks(wordId)
      if (response.data.success) {
        return {
          books: response.data.book || [],
          inReview: !!response.data.inReview,
        }
      }
      return null
    } catch (e) {
      console.error('Get belonging books failed', e)
      return null
    }
  }

  /**
   * 移动单词
   */
  const moveWords = async (
    targetWords: Word[],
    targetBookId: number,
    sourceBookId: number,
    successMessage?: string,
  ) => {
    try {
      // 1. 添加到目标单词本
      const res = await wordsApi.addWordsToBook(targetBookId, targetWords)
      if (!res.data.success) throw new Error(res.data.message || '移动失败')

      // 更新本地数据的 book_count (这对未入本单词视图尤为重要)
      if (res.data.word && Array.isArray(res.data.word)) {
        res.data.word.forEach((updatedWord) => {
          const index = words.value.findIndex((w) => w.id === Number(updatedWord.id))
          const existingWord = words.value[index]
          if (index !== -1 && existingWord) {
            // 强制替换对象以触发计算属性更新 (解决未入本视图不刷新的问题)
            words.value[index] = {
              ...existingWord,
              book_count: Number(updatedWord.book_count || 0),
            }
          }
        })
      }

      // 2. 从源单词本移除 (如果是全部单词视图 bid=0，则不移除，仅视为添加到新本)
      if (sourceBookId !== 0) {
        await deleteWords(targetWords, sourceBookId, true)
      }

      // 3. 重新加载单词本列表以更新计数 (特别是目标单词本的计数)
      const booksStore = useBooksStore()
      await booksStore.loadBooks()
      // 重新关联 currentBook 以确保 UI 显示最新的 nums
      if (booksStore.currentBook) {
        const refreshedBook = booksStore.books.find((b) => b.id === booksStore.currentBook?.id)
        if (refreshedBook) booksStore.setCurrentBook(refreshedBook)
      }

      toast.showSuccess(successMessage || '移动成功')
      return true
    } catch (error) {
      console.error('Move words failed:', error)
      toast.showFail(successMessage ? successMessage.replace('成功', '失败') : '移动失败')
      return false
    }
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
    setSortMode,
    addToReview,
    batchAddToReview,
    saveWord,
    deleteWords,
    moveWords,
    updatePhon,
    saveExplanation,
    deleteExplanation,
    saveSentence,
    deleteSentence,
    moveExplanation,
    moveSentence,
    setCurrentWord,
    setSearchKeyword,
    findWordByName,
    clearWords,
    toggleOrphanFilter,
    checkWordExistence,
    lookupDict,
    getBelongingBooks,
  }
}

export const useWordsStore = defineStore('words', defineWordsStore)
