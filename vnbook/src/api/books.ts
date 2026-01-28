import request from './request'
import type { Book, ApiResponse } from '@/types'

/**
 * 获取单词本列表
 */
export const getBooks = () => {
  return request.get<ApiResponse>('/books.php')
}

/**
 * 创建或更新单词本
 */
export const saveBook = (book: Book) => {
  return request.put<ApiResponse>('/books.php', book)
}

/**
 * 删除单词本
 */
export const deleteBook = (book: Book) => {
  return request.delete<ApiResponse>('/books.php', {
    data: book,
  })
}
