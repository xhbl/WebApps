import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as wordsApi from '@/api/words'
import type { LexicalCat } from '@/types'

export const usePosStore = defineStore('pos', () => {
  // State
  const lexicalCats = ref<LexicalCat[]>([])
  const loaded = ref(false)

  // Actions
  /**
   * 加载词性列表
   */
  const loadLexicalCats = async () => {
    if (loaded.value) return true

    try {
      const response = await wordsApi.getLexicalCats()
      if (response.data.success === 'true' && response.data.lexicalcat) {
        lexicalCats.value = response.data.lexicalcat
        loaded.value = true
        return true
      }
      return false
    } catch (error) {
      console.error('Load lexical cats failed:', error)
      return false
    }
  }

  /**
   * 根据 ID 获取词性
   */
  const getLexicalCatById = (id: number): LexicalCat | undefined => {
    return lexicalCats.value.find((cat) => cat.Id === id)
  }

  /**
   * 根据缩写获取词性
   */
  const getLexicalCatByAbbr = (abbr: string): LexicalCat | undefined => {
    return lexicalCats.value.find((cat) => cat.abbr === abbr)
  }

  return {
    lexicalCats,
    loaded,
    loadLexicalCats,
    getLexicalCatById,
    getLexicalCatByAbbr,
  }
})
