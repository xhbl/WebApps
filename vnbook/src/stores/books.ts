import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as booksApi from '@/api/books'
import type { Book } from '@/types'
import { toast } from '@/utils/toast'
import { showDialog } from 'vant'

export const useBooksStore = defineStore('books', () => {
  // State
  const books = ref<Book[]>([])
  const currentBook = ref<Book | null>(null)

  // Actions
  /**
   * 加载单词本列表
   */
  const loadBooks = async () => {
    try {
      const response = await booksApi.getBooks()
      if (response.data.success === 'true' && response.data.book) {
        books.value = response.data.book
        return true
      }
      return false
    } catch (error) {
      console.error('Load books failed:', error)
      return false
    }
  }

  /**
   * 保存单词本（创建或更新）
   */
  const saveBook = async (book: Book) => {
    try {
      const response = await booksApi.saveBook(book)
      if (response.data.success === 'true' && response.data.book && response.data.book[0]) {
        const savedBook = response.data.book[0]

        if (book._new === 1) {
          // 新增
          books.value.unshift(savedBook)
          toast.showSuccess('创建成功')
        } else {
          // 更新
          const index = books.value.findIndex((b) => b.Id === savedBook?.Id)
          if (index !== -1 && savedBook) {
            books.value[index] = savedBook
          }
          toast.showSuccess('更新成功')
        }

        return savedBook
      }
      return null
    } catch (error) {
      console.error('Save book failed:', error)
      return null
    }
  }

  /**
   * 删除单词本
   */
  const deleteBook = async (book: Book) => {
    // 检查是否为空
    if (book.nums > 0) {
      showDialog({
        title: '提示',
        message: '请先删除单词本中的所有单词',
      })
      return false
    }

    try {
      const confirmed = await showDialog({
        title: '确认删除',
        message: `确定要删除单词本"${book.title}"吗？`,
      })

      if (!confirmed) return false

      await booksApi.deleteBook(book)

      // 从列表中移除
      const index = books.value.findIndex((b) => b.Id === book.Id)
      if (index !== -1) {
        books.value.splice(index, 1)
      }

      if (currentBook.value?.Id === book.Id) {
        currentBook.value = null
      }

      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      console.error('Delete book failed:', error)
      return false
    }
  }

  /**
   * 设置当前单词本
   */
  const setCurrentBook = (book: Book | null) => {
    currentBook.value = book
  }

  /**
   * 更新单词本的单词数量
   */
  const updateBookNums = (bookId: number, nums: number) => {
    const book = books.value.find((b) => b.Id === bookId)
    if (book) {
      book.nums = nums
    }
    if (currentBook.value?.Id === bookId) {
      currentBook.value.nums = nums
    }
  }

  /**
   * 生成临时 ID
   */
  const generateTempId = () => {
    return new Date().getTime() + Math.floor(Math.random() * 1000)
  }

  return {
    books,
    currentBook,
    loadBooks,
    saveBook,
    deleteBook,
    setCurrentBook,
    updateBookNums,
    generateTempId,
  }
})
