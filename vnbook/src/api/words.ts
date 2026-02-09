import request from './request'
import type { Word, Explanation, Sentence, ApiResponse, BaseDictInfo } from '@/types'

/**
 * 获取单词列表（包含释义和例句）
 */
export const getWords = (bookId: number, word?: string) => {
  return request.get<ApiResponse>('/words.php', {
    params: {
      bid: bookId,
      req: 'w',
      word,
    },
  })
}

/**
 * 创建或更新单词
 */
export const saveWord = (word: Word & { book_id?: number }) => {
  return request.put<ApiResponse>('/words.php', word, {
    params: { req: 'w', bid: word.book_id },
  })
}

/**
 * 批量添加单词到单词本 (用于移动/复制)
 * 强制设置 _new=2 以便后端处理映射关系
 */
export const addWordsToBook = (bookId: number, words: Word[]) => {
  const payload = words.map((w) => ({ ...w, _new: 2 }))
  return request.put<ApiResponse>('/words.php', payload, {
    params: { req: 'w', bid: bookId },
  })
}

/**
 * 删除单词
 */
export const deleteWord = (word: Word) => {
  return request.delete<ApiResponse>('/words.php', {
    data: word,
    params: { req: 'w' },
  })
}

/**
 * 批量删除单词
 */
export const deleteWords = (bookId: number, words: Word[]) => {
  return request.delete<ApiResponse>('/words.php', {
    data: words,
    params: { req: 'w', bid: bookId },
  })
}

/**
 * 更新单词音标
 */
export const updateWordPhon = (wordId: number, phon: string) => {
  return request.put<ApiResponse>(
    '/words.php',
    {
      Id: wordId,
      phon,
      _new: 0,
    },
    {
      params: { req: 'w' },
    },
  )
}

/**
 * 创建或更新释义
 */
export const saveExplanation = (explanation: Explanation) => {
  return request.put<ApiResponse>('/words.php', explanation, {
    params: { req: 'e' },
  })
}

/**
 * 删除释义
 */
export const deleteExplanation = (explanation: Explanation) => {
  return request.delete<ApiResponse>('/words.php', {
    data: explanation,
    params: { req: 'e' },
  })
}

/**
 * 创建或更新例句
 */
export const saveSentence = (sentence: Sentence) => {
  return request.put<ApiResponse>('/words.php', sentence, {
    params: { req: 's' },
  })
}

/**
 * 删除例句
 */
export const deleteSentence = (sentence: Sentence) => {
  return request.delete<ApiResponse>('/words.php', {
    data: sentence,
    params: { req: 's' },
  })
}

/**
 * 获取词性列表
 */
export const getPosList = () => {
  return request.get<ApiResponse>('/pos.php')
}

/**
 * 查询基础词典 (va_basedict)
 */
export const lookupBaseDict = (word: string) => {
  return request.get<ApiResponse<BaseDictInfo>>('/words.php', {
    params: { req: 'dict', word },
  })
}
