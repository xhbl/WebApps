import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as booksApi from '@/api/books'
import type { Book } from '@/types'
import { toast } from '@/utils/toast'

export const useBooksStore = defineStore('books', () => {
  // State
  const books = ref<Book[]>([])
  const currentBook = ref<Book | null>(null)

  // 本地排序逻辑：ptop DESC, sorder ASC, time_c DESC
  const sortBooksLocal = () => {
    books.value.sort((a, b) => {
      const ptopA = a.ptop || 0
      const ptopB = b.ptop || 0
      if (ptopA !== ptopB) return ptopB - ptopA // ptop=1 first

      const sorderA = a.sorder || 0
      const sorderB = b.sorder || 0
      if (sorderA !== sorderB) return sorderA - sorderB // sorder ASC

      return (b.time_c || '').localeCompare(a.time_c || '') // time_c DESC
    })
  }

  // Actions
  /**
   * 加载单词本列表
   */
  const loadBooks = async () => {
    try {
      const response = await booksApi.getBooks()
      if (response.data.success === true && response.data.book) {
        books.value = response.data.book.map((b: Book) => ({
          ...b,
          ptop: Number(b.ptop || 0),
          sorder: Number(b.sorder || 0),
        }))
        sortBooksLocal()
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
  const saveBook = async (book: Book, silent = false) => {
    try {
      const response = await booksApi.saveBook(book)
      if (response.data.success === true && response.data.book && response.data.book[0]) {
        const savedBook = response.data.book[0]

        if (book._new === 1) {
          // 新增
          books.value.unshift(savedBook)
          sortBooksLocal()
          if (!silent) toast.showSuccess('创建成功')
        } else {
          // 更新
          const index = books.value.findIndex((b) => b.id === savedBook.id)
          if (index !== -1 && savedBook) {
            books.value.splice(index, 1, savedBook)
          }
          if (!silent) toast.showSuccess('更新成功')
        }

        return savedBook
      }
      return null
    } catch (error) {
      console.error('Save book failed:', error)
      if (!silent) toast.showFail('保存失败')
      return null
    }
  }

  /**
   * 删除单词本（仅数据处理，弹窗交互由 View 层负责）
   */
  const deleteBook = async (book: Book) => {
    try {
      await booksApi.deleteBook(book)
      const index = books.value.findIndex((b) => b.id === book.id)
      if (index !== -1) {
        books.value.splice(index, 1)
      }
      if (currentBook.value?.id === book.id) {
        currentBook.value = null
      }
      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      console.error('Delete book failed:', error)
      toast.showFail('删除失败')
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
    const book = books.value.find((b) => b.id === bookId)
    if (book) {
      book.nums = nums
    }
    if (currentBook.value?.id === bookId) {
      currentBook.value.nums = nums
    }
  }

  /**
   * 生成临时 ID
   */
  const generateTempId = () => {
    return new Date().getTime() + Math.floor(Math.random() * 1000)
  }

  /**
   * 置顶/取消置顶
   */
  const togglePin = async (book: Book) => {
    book.ptop = book.ptop === 1 ? 0 : 1
    sortBooksLocal()
    await saveBook(book, true)
  }

  /**
   * 移动书籍 (direction: -1 for Up, 1 for Down)
   */
  const moveBook = async (book: Book, direction: number) => {
    // 1. 获取同组书籍 (置顶或非置顶)
    const isPinned = !!book.ptop
    const group = books.value.filter((b) => !!b.ptop === isPinned)
    const currentIndex = group.findIndex((b) => b.id === book.id)

    if (currentIndex === -1) return
    const targetIndex = currentIndex + direction

    if (targetIndex < 0 || targetIndex >= group.length) return

    // 2. 在逻辑组中交换位置
    const desiredOrder = [...group]
    // const temp = desiredOrder[currentIndex]
    if (desiredOrder[currentIndex] && desiredOrder[targetIndex]) {
      const tmp = desiredOrder[currentIndex]
      desiredOrder[currentIndex] = desiredOrder[targetIndex]!
      desiredOrder[targetIndex] = tmp!
    }

    // 3. 重新分配 sorder (使用数组索引) 并收集变更
    const updates: Book[] = []
    desiredOrder.forEach((b, idx) => {
      if (b.sorder !== idx) {
        b.sorder = idx
        updates.push(b)
        // 同步更新本地状态
        const local = books.value.find((lb) => lb.id === b.id)
        if (local) local.sorder = idx
      }
    })

    sortBooksLocal()

    // 4. 批量保存
    if (updates.length > 0) {
      try {
        await booksApi.saveBooks(updates)
      } catch (e) {
        console.error('Move failed', e)
      }
    }
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
    togglePin,
    moveBook,
  }
})
