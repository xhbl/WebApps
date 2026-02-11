import { ref } from 'vue'
import { useBooksStore } from '@/stores/books'
import { showGlobalDialog } from '@/composables/useGlobalDialog'
import type { Book } from '@/types'

export function useBookOperations() {
  const booksStore = useBooksStore()

  // --- 编辑/添加功能逻辑 ---
  const showBookEditor = ref(false)
  const editingBook = ref<Book | null>(null)

  const openAddBook = () => {
    editingBook.value = { id: 0, title: '', nums: 0, time_c: '', hide: 0, _new: 1 }
    showBookEditor.value = true
  }

  const openEditBook = (book: Book) => {
    // 复制对象以避免直接修改 store 中的数据
    editingBook.value = { ...book, _new: 0 }
    showBookEditor.value = true
  }

  // --- 删除功能逻辑 ---
  const handleDeleteBook = async (book: Book) => {
    try {
      const result = await showGlobalDialog({
        title: '删除单词本',
        message: `确定要删除“${book.title}”单词本吗？`,
        showCancelButton: true,
        confirmButtonText: '删除',
        confirmButtonColor: 'var(--van-danger-color)',
        showCheckbox: true,
        checkboxLabel: '同时删除单词本内的所有单词（若也存在于其他单词本中则不会被删除）',
      })

      const deleteWords = typeof result === 'object' ? result.checked : false
      const success = await booksStore.deleteBook({ ...book, deleteWords })

      if (success) {
        // 如果正在编辑该单词本，关闭编辑器
        if (editingBook.value?.id === book.id) {
          editingBook.value = null
          showBookEditor.value = false
        }
      }
      return success
    } catch {
      return false
    }
  }

  // --- 置顶/排序功能逻辑 ---
  const handlePinBook = async (book: Book) => {
    await booksStore.togglePin(book)
  }

  const handleMoveBook = async (book: Book, direction: number) => {
    await booksStore.moveBook(book, direction)
  }

  return {
    showBookEditor,
    editingBook,
    openAddBook,
    openEditBook,
    handleDeleteBook,
    handlePinBook,
    handleMoveBook,
  }
}
