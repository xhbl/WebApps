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
 * 批量保存单词本 (用于排序等)
 */
export const saveBooks = (books: Book[]) => {
  return request.put<ApiResponse>('/books.php', books)
}

/**
 * 删除单词本
 */
export const deleteBook = (book: Book) => {
  return request.delete<ApiResponse>('/books.php', {
    data: book,
  })
}
