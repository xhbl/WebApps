import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as wordsApi from '@/api/words'
import type { Pos } from '@/types'

export const usePosStore = defineStore('pos', () => {
  // State
  const posList = ref<Pos[]>([])
  const loaded = ref(false)

  // Actions
  /**
   * 加载词性列表
   */
  const loadPosList = async () => {
    if (loaded.value) return true

    try {
      const response = await wordsApi.getPosList()
      if (response.data.success === 'true' && response.data.lexicalcat) {
        posList.value = response.data.lexicalcat
        loaded.value = true
        return true
      }
      return false
    } catch (error) {
      console.error('Load pos list failed:', error)
      return false
    }
  }

  /**
   * 根据 ID 获取词性
   */
  const getPosById = (id: number): Pos | undefined => {
    return posList.value.find((cat) => cat.id === id)
  }

  /**
   * 根据缩写获取词性
   */
  const getPosByAbbr = (abbr: string): Pos | undefined => {
    return posList.value.find((cat) => cat.abbr === abbr)
  }

  return {
    posList,
    loaded,
    loadPosList,
    getPosById,
    getPosByAbbr,
  }
})
