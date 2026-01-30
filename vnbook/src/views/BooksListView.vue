<template>
  <div class="books-manage-view">
    <van-nav-bar :title="userBookTitle" fixed placeholder>
      <template #left>
        <van-icon name="plus" size="22" @click="openNewBook" />
      </template>
      <template #right>
        <van-icon name="ellipsis" size="22" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <van-cell
            v-for="b in booksStore.books"
            :key="b.id"
            :title="b.title"
            :label="`单词数: ${b.nums}`"
            is-link
            @click="enterWordsList(b)"
          >
            <template #icon>
              <van-icon name="edit" class="book-edit-icon" @click.stop="editBook(b)" />
            </template>
          </van-cell>
          <van-empty
            v-if="booksStore.books.length === 0"
            description="暂无单词本，点击左上角➕新建"
          />
        </div>
      </van-pull-refresh>
    </div>

    <AppMenu />
    <UserDialog />
    <book-editor-dialog
      v-model="showEditor"
      :book="editorBook"
      @save="saveBook"
      @delete="deleteBook"
    />
    <van-dialog
      v-model:show="showDeleteDialog"
      :title="deleteDialogTitle"
      show-cancel-button
      confirm-button-text="删除"
      confirm-button-color="var(--van-danger-color)"
      cancel-button-text="取消"
      @confirm="onConfirmDeleteBook"
    >
      <div class="custom-dialog-container">
        <div class="delete-message">
          {{ deleteDialogMessage }}
        </div>

        <div class="delete-checkbox-area">
          <van-checkbox v-model="deleteWordsChecked" icon-size="18px">
            同时删除单词本内的所有单词（若也存在于其他单词本中则不会被删除）
          </van-checkbox>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useAppMenu } from '@/composables/useAppMenu'
import BookEditorDialog from '@/components/BookEditorDialog.vue'
import type { Book } from '@/types'

const booksStore = useBooksStore()
const authStore = useAuthStore()
const router = useRouter()
const enterWordsList = (b: Book) => {
  // 跳转到单词本详情页（WordsListView）
  router.push(`/books/${b.id}/words`)
}
const showEditor = ref(false)
const editorBook = ref<Book | null>(null)
const refreshing = ref(false)
const loading = ref(true)

const userBookTitle = computed(() => {
  return authStore.userDisplayName ? `${authStore.userDisplayName}的单词本` : '我的单词本'
})

onMounted(async () => {
  loading.value = true
  await booksStore.loadBooks()
  loading.value = false
})

const onRefresh = async () => {
  refreshing.value = true
  await booksStore.loadBooks()
  refreshing.value = false
}

const openNewBook = () => {
  editorBook.value = { id: 0, title: '', nums: 0, time_c: '', hide: 0, _new: 1 }
  showEditor.value = true
}

const { openMenu, AppMenu, UserDialog } = useAppMenu({
  items: [{ name: '新建单词本', icon: 'plus', handler: openNewBook }],
})

const editBook = (b: Book) => {
  editorBook.value = { ...b, _new: 0 }
  showEditor.value = true
}

const saveBook = async (book: Book) => {
  const saved = await booksStore.saveBook(book)
  if (saved) {
    editorBook.value = null
  }
}

const showDeleteDialog = ref(false)
const deleteDialogTitle = ref('')
const deleteDialogMessage = ref('')
const deleteWordsChecked = ref(false)
let pendingDeleteBook: Book | null = null

const deleteBook = (book: Book) => {
  pendingDeleteBook = book
  deleteDialogTitle.value = '删除单词本'
  deleteDialogMessage.value = `确定要删除“${book.title}”单词本吗？`
  deleteWordsChecked.value = false
  showDeleteDialog.value = true
}

const onConfirmDeleteBook = async () => {
  if (!pendingDeleteBook) return
  // 这里可将 deleteWordsChecked.value 作为参数传递给 store 或 API
  await booksStore.deleteBook({ ...pendingDeleteBook, deleteWords: deleteWordsChecked.value })
  editorBook.value = null
  showDeleteDialog.value = false
  pendingDeleteBook = null
}
</script>

<style scoped>
.books-manage-view {
  min-height: 100vh;
  background-color: var(--van-background);
}

.content {
  padding-top: 0px;
}

.loading {
  padding: 20px;
  text-align: center;
  color: var(--van-text-color-3);
}

/* 图标点击样式 */
.van-icon {
  font-weight: 700;
  cursor: pointer;
}
/* 优化 ActionSheet 内部图标间距 */
:deep(.van-action-sheet__item) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
/* 调整标题字号 */
:deep(.van-nav-bar__title) {
  font-size: var(--van-font-size-xl);
}

/* 调整列表字号 */
:deep(.van-cell__title) {
  font-size: var(--van-font-size-lg);
  font-weight: 500;
}
:deep(.van-cell__label) {
  font-size: var(--van-font-size-md);
}

/* 用户列表 图标优化 */
:deep(.book-edit-icon) {
  font-size: 24px;
  margin-right: 12px;
  color: var(--van-primary-color);
  display: flex;
  align-items: center;
  height: 100%; /* 确保在 Cell 容器中垂直居中 */
}

/* 确保单元格内容与图标对齐 */
:deep(.van-cell) {
  align-items: center;
}

.custom-dialog-container {
  padding: 8px 24px 24px; /* Vant 原生 Dialog message 有较大的左右边距 */
}

.delete-message {
  font-size: var(--van-dialog-message-font-size);
  line-height: var(--van-dialog-message-line-height);
  color: var(--van-dialog-message-color);
  text-align: center;
  word-break: normal; /* 确保不在单词中间截断 */
  overflow-wrap: break-word; /* 仅在空格或必要时换行 */
  margin-bottom: 16px; /* 撑开文字与复选框的间距 */
}

.delete-checkbox-area {
  display: flex;
  justify-content: center; /* 居中对齐复选框 */
}

/* 调整复选框文字大小，使其不突兀 */
:deep(.delete-checkbox-area .van-checkbox__label) {
  font-size: 14px;
  color: var(--van-text-color-2);
}
</style>
