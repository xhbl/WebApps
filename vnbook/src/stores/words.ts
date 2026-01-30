import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as wordsApi from '@/api/words'
import type { Word, Explanation, Sentence, SortMode, GroupedWords } from '@/types'
import { toast } from '@/utils/toast'
import { showDialog } from 'vant'
import { useBooksStore } from './books'

// Raw response types from backend (ids may be string/number, hide flags as string/number)
interface RawSentence {
  Id: string | number
  eid: string | number
  sen: string
  sen_ch?: string
  hide: string | number
}

interface RawExplanation {
  Id: string | number
  wid: string | number
  lid: string | number
  exp_ch: string
  exp?: string
  abbr: string
  hide: string | number
  sentences?: RawSentence[]
}

interface RawWord {
  Id: string | number
  name: string
  phon?: string
  bid?: string | number
  time_c: string
  hide: string | number
  explanations?: RawExplanation[]
}

export const useWordsStore = defineStore('words', () => {
  // State
  const words = ref<Word[]>([])
  const currentWord = ref<Word | null>(null)
  const sortMode = ref<SortMode>('date')

  // Getters
  /**
   * 分组后的单词列表
   */
  const groupedWords = computed<GroupedWords[]>(() => {
    if (words.value.length === 0) return []

    if (sortMode.value === 'date') {
      // 按日期分�?      const groups = new Map<string, Word[]>()

      words.value.forEach((word) => {
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
      // 按字母分�?      const groups = new Map<string, Word[]>()

      words.value.forEach((word) => {
        const letter = word.name.charAt(0).toUpperCase()
        if (!groups.has(letter)) {
          groups.set(letter, [])
        }
        groups.get(letter)!.push(word)
      })

      // 按字母顺序排�?      const sortedEntries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))

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
      if (response.data.success === 'true' && response.data.word) {
        // Normalize numeric ids to numbers to ensure route param matching
        words.value = response.data.word.map((w: RawWord) => ({
          ...w,
          Id: Number(w.Id),
          bid: w.bid !== undefined ? Number(w.bid) : bookId,
          hide: w.hide === '1' || w.hide === 1 ? 1 : 0,
          explanations: (w.explanations || []).map((e: RawExplanation) => ({
            ...e,
            Id: Number(e.Id),
            wid: Number(e.wid),
            lid: Number(e.lid),
            hide: e.hide === '1' || e.hide === 1 ? 1 : 0,
            sentences: (e.sentences || []).map((s: RawSentence) => ({
              ...s,
              Id: Number(s.Id),
              eid: Number(s.eid),
              hide: s.hide === '1' || s.hide === 1 ? 1 : 0,
            })),
          })),
        }))

        // 按排序模式排�?        sortWords()
        return true
      }
      return false
    } catch (error) {
      console.error('Load words failed:', error)
      return false
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
      // 按字母顺�?      words.value.sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  /**
   * 切换排序模式
   */
  const toggleSortMode = () => {
    sortMode.value = sortMode.value === 'date' ? 'alpha' : 'date'
    sortWords()
  }

  /**
   * 保存单词（两阶段添加逻辑�?   */
  const saveWord = async (word: Word) => {
    try {
      const response = await wordsApi.saveWord(word)
      if (response.data.success === 'true' && response.data.word && response.data.word[0]) {
        const savedWord = response.data.word[0]

        // 检查是否需要二次确�?        if (savedWord?._new === 2) {
          // 单词已存在于其他单词本中
          const confirmed = await showDialog({
            title: '单词已存�?,
            message: `单词"${savedWord.name}"已存在于其他单词本中，要加入此单词本吗？`,
          })

          if (confirmed && savedWord) {
            // 第二次提交，只添加映射关�?            return await saveWord(savedWord)
          }
          return null
        }

        if (word._new === 1) {
          // 新增
          words.value.push(savedWord)
          sortWords()
          toast.showSuccess('添加成功')

          // 更新单词本数�?          const booksStore = useBooksStore()
          if (booksStore.currentBook) {
            booksStore.updateBookNums(booksStore.currentBook.Id, booksStore.currentBook.nums + 1)
          }
        } else {
          // 更新
          const index = words.value.findIndex((w) => w.Id === savedWord?.Id)
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
   * 删除单词
   */
  const deleteWord = async (word: Word) => {
    try {
      const confirmed = await showDialog({
        title: '确认删除',
        message: `确定要删除单�?${word.name}"吗？`,
      })

      if (!confirmed) return false

      await wordsApi.deleteWord(word)

      // 从列表中移除
      const index = words.value.findIndex((w) => w.id === word.id)
      if (index !== -1) {
        words.value.splice(index, 1)
      }

      if (currentWord.value?.id === word.id) {
        currentWord.value = null
      }

      // 更新单词本数�?      const booksStore = useBooksStore()
      if (booksStore.currentBook) {
        booksStore.updateBookNums(booksStore.currentBook.id, booksStore.currentBook.nums - 1)
      }

      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      console.error('Delete word failed:', error)
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
        response.data.success === 'true' &&
        response.data.word &&
        response.data.word[0]?.explanations?.[0]
      ) {
        const savedExp = response.data.word[0].explanations![0]

        // 更新当前单词的释义列        if (currentWord.value && currentWord.value.id === explanation.wid) {
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

          // 同步�?words 列表
          const word = words.value.find((w) => w.id === explanation.wid)
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
        message: '确定要删除这条释义吗�?,
      })

      if (!confirmed) return false

      await wordsApi.deleteExplanation(explanation)

      // 从当前单词的释义列表中移�?      if (currentWord.value && currentWord.value.explanations) {
        const index = currentWord.value.explanations.findIndex((e) => e.id === explanation.id)
        if (index !== -1) {
          currentWord.value.explanations.splice(index, 1)
        }

        // 同步�?words 列表
        const word = words.value.find((w) => w.id === explanation.wid)
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
        response.data.success === 'true' &&
        response.data.word &&
        response.data.word[0]?.explanations?.[0]?.sentences?.[0]
      ) {
        const savedSen = response.data.word[0].explanations![0].sentences![0]

        // 更新当前单词的例句列�?        if (currentWord.value && currentWord.value.explanations) {
          const exp = currentWord.value.explanations.find((e) => e.id === expId)
          if (exp) {
            if (!exp.sentences) {
              exp.sentences = []
            }

            if (sentence._new === 1 && savedSen) {
              exp.sentences.push(savedSen)
              toast.showSuccess('添加成功')
            } else if (savedSen) {
              const index = exp.sentences.findIndex((s) => s.id === savedSen.id)
              if (index !== -1) {
                exp.sentences[index] = savedSen
              }
              toast.showSuccess('更新成功')
            }

            // 同步�?words 列表
            const word = words.value.find((w) => w.id === currentWord.value!.id)
            if (word && word.explanations) {
              const wordExp = word.explanations.find((e) => e.Id === expId)
              if (wordExp) {
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
        message: '确定要删除这条例句吗�?,
      })

      if (!confirmed) return false

      await wordsApi.deleteSentence(sentence)

      // 从释义的例句列表中移�?      if (currentWord.value && currentWord.value.explanations) {
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
   * 根据单词名查找单词（本地�?   */
  const findWordByName = (name: string): Word | undefined => {
    return words.value.find((w) => w.name.toLowerCase() === name.toLowerCase())
  }

  /**
   * 清空单词列表
   */
  const clearWords = () => {
    words.value = []
    currentWord.value = null
  }

  return {
    words,
    currentWord,
    sortMode,
    groupedWords,
    loadWords,
    sortWords,
    toggleSortMode,
    saveWord,
    deleteWord,
    updatePhon,
    saveExplanation,
    deleteExplanation,
    saveSentence,
    deleteSentence,
    setCurrentWord,
    findWordByName,
    clearWords,
  }
})

