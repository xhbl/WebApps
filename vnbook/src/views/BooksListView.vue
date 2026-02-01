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

    <!-- 全部单词条目 (Sticky 置顶) -->
    <div v-if="showAllWords" class="sticky-header van-hairline--bottom">
      <van-cell
        title="全部单词"
        :label="`单词总数：${totalWords}`"
        is-link
        @click="enterAllWords"
        class="all-words-cell"
      >
        <template #icon>
          <div class="icon-wrapper" @click.stop>
            <van-popover
              v-model:show="showAllWordsPopover"
              :actions="allWordsPopoverActions"
              placement="bottom-start"
              @select="onAllWordsAction"
            >
              <template #reference>
                <van-icon name="label" class="book-edit-icon" />
              </template>
            </van-popover>
          </div>
        </template>
        <template #right-icon>
          <img src="/resources/icons/favicon-192.png" class="right-more-icon" />
        </template>
      </van-cell>
    </div>

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
            :class="{ 'pinned-book': b.ptop === 1 }"
            @click="enterWordsList(b)"
          >
            <template #icon>
              <div class="icon-wrapper" @click.stop>
                <van-popover
                  v-model:show="showBookPopover[b.id]"
                  :actions="getBookActions(b)"
                  placement="bottom-start"
                  @select="(action) => onBookAction(action, b)"
                >
                  <template #reference>
                    <van-icon name="label-o" class="book-edit-icon" />
                  </template>
                </van-popover>
              </div>
            </template>
            <template #right-icon>
              <img src="/resources/icons/vnb-more.png" class="right-more-icon" />
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
    <book-editor-dialog v-model="showEditor" :book="editorBook" @delete="deleteBook" />
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
const enterAllWords = () => {
  router.push(`/books/0/words`)
}
const showEditor = ref(false)
const editorBook = ref<Book | null>(null)
const refreshing = ref(false)
const loading = ref(true)

const userBookTitle = computed(() => {
  return authStore.userDisplayName ? `${authStore.userDisplayName}的单词本` : '我的单词本'
})

// 初始化 showAllWords 状态
const showAllWords = ref(!authStore.userInfo?.cfg?.hideAllWords)

const totalWords = computed(() => {
  return booksStore.books.reduce((sum, b) => sum + b.nums, 0)
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

const showAllWordsPopover = ref(false)
const allWordsPopoverActions = [{ text: '隐藏', icon: 'closed-eye', key: 'hide' }]

const onAllWordsAction = (action: { key: string }) => {
  if (action.key === 'hide') {
    showAllWordsPopover.value = false
    showAllWords.value = false
    authStore.updateUserConfig({ hideAllWords: true })
  }
}

const toggleShowAllWords = () => {
  showAllWords.value = !showAllWords.value
  authStore.updateUserConfig({ hideAllWords: !showAllWords.value })
}

const showBookPopover = ref<Record<number, boolean>>({})

const getBookActions = (b: Book) => {
  const actions = [{ text: '编辑', icon: 'edit', key: 'edit' }]

  // 置顶/取消置顶
  actions.push({
    text: b.ptop === 1 ? '取消置顶' : '置顶',
    icon: b.ptop === 1 ? 'down' : 'back-top',
    key: 'pin',
  })

  // 计算同组位置
  const group = booksStore.books.filter((item) => !!item.ptop === !!b.ptop)
  const index = group.findIndex((item) => item.id === b.id)

  // 上移 (不是第一个)
  if (index > 0) {
    actions.push({ text: '上移', icon: 'arrow-up', key: 'up' })
  }
  // 下移 (不是最后一个)
  if (index < group.length - 1) {
    actions.push({ text: '下移', icon: 'arrow-down', key: 'down' })
  }

  return actions
}

const onBookAction = (action: { key: string }, b: Book) => {
  showBookPopover.value[b.id] = false
  if (action.key === 'edit') {
    showBookPopover.value[b.id] = false
    editBook(b)
  } else if (action.key === 'pin') {
    booksStore.togglePin(b)
  } else if (action.key === 'up') {
    booksStore.moveBook(b, -1)
  } else if (action.key === 'down') {
    booksStore.moveBook(b, 1)
  }
}

const { openMenu, AppMenu, UserDialog } = useAppMenu({
  get items() {
    return [
      { name: '新建单词本', icon: 'plus', handler: openNewBook },
      {
        name: showAllWords.value ? '隐藏[全部单词]' : '显示[全部单词]',
        icon: showAllWords.value ? 'closed-eye' : 'eye-o',
        handler: toggleShowAllWords,
      },
    ]
  },
})

const editBook = (b: Book) => {
  editorBook.value = { ...b, _new: 0 }
  showEditor.value = true
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

.sticky-header {
  position: sticky;
  top: var(--van-nav-bar-height);
  z-index: 10;
}

.all-words-cell {
  background-color: var(--van-gray-2); /* 灰色背景 */
  align-items: center;
}

.pinned-book {
  background-color: var(--van-gray-1); /* 置顶项灰色背景 */
}

.icon-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
}

.right-more-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
</style>
