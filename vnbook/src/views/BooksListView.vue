<template>
  <div class="books-manage-view">
    <van-nav-bar :title="userBookTitle" fixed placeholder>
      <template #left>
        <van-icon name="plus" size="22" @click="openNewBook" />
      </template>
      <template #right>
        <van-icon name="ellipsis" size="22" @click="showActionSheet = true" />
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
          <!-- 清理残留 JS 代码，修复标签闭合 -->
          <van-empty
            v-if="booksStore.books.length === 0"
            description="暂无单词本，点击左上角➕新建"
          />
        </div>
      </van-pull-refresh>
    </div>

    <van-action-sheet
      v-model:show="showActionSheet"
      :actions="actions"
      cancel-text="取消"
      @select="onMenuSelect"
    />

    <book-editor-dialog
      v-model="showEditor"
      :book="editorBook"
      @save="saveBook"
      @delete="deleteBook"
    />
    <user-mod-dialog v-model="showUserMod" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import BookEditorDialog from '@/components/BookEditorDialog.vue'
import UserModDialog from '@/components/UserModDialog.vue'
import type { Book, MenuAction } from '@/types'

const booksStore = useBooksStore()
const authStore = useAuthStore()
const router = useRouter()
const enterWordsList = (b: Book) => {
  // 跳转到单词本详情页（WordsListView）
  router.push(`/books/${b.id}/words`)
}
const showActionSheet = ref(false)
const showEditor = ref(false)
const showUserMod = ref(false)
const editorBook = ref<Book | null>(null)
const refreshing = ref(false)
const loading = ref(true)

const userBookTitle = computed(() => {
  const name = authStore.userInfo?.dname?.trim()
    ? authStore.userInfo.dname
    : authStore.userInfo?.uname || ''
  return name ? `${name}的单词本` : '我的单词本'
})
// 修改点：在 actions 中增加了 icon 和 color
const actions = computed<MenuAction[]>(() => [
  {
    name: '新建单词本',
    key: 'new',
    icon: 'plus',
  },
  {
    name: `${authStore.userInfo?.dname?.trim() ? authStore.userInfo.dname : authStore.userInfo?.uname}`,
    key: 'mod',
    icon: 'user-circle-o',
  },
  {
    name: '退出登录',
    key: 'logout',
    icon: 'close',
    color: 'var(--van-warning-color)',
  },
])

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

const deleteBook = async (book: Book) => {
  // 先校验是否可删
  if (book.nums > 0) {
    await showDialog({
      title: '提示',
      message: '请先删除单词本中的所有单词',
    })
    return
  }
  try {
    await showDialog({
      title: '删除单词本',
      message: `确定要删除单词本“${book.title}”吗？<br><br><span style="color:var(--van-danger-color)"><b>单词本内的单词不会被删除。</b></span>`,
      confirmButtonText: '彻底删除',
      confirmButtonColor: 'var(--van-danger-color)',
      cancelButtonText: '取消',
      showCancelButton: true,
      allowHtml: true,
    })
    await booksStore.deleteBook(book)
    editorBook.value = null
  } catch {
    // 用户点击取消，不做任何处理
  }
}

const onMenuSelect = (action: MenuAction) => {
  showActionSheet.value = false
  switch (action.key) {
    case 'new':
      openNewBook()
      break
    case 'mod':
      showUserMod.value = true
      break
    case 'logout':
      const userName = authStore.userInfo?.dname?.trim()
        ? authStore.userInfo.dname
        : authStore.userInfo?.uname || '请确认'
      showDialog({
        title: userName,
        message: '确定要退出登录吗？',
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        showCancelButton: true,
      })
        .then(async () => {
          // 点击确认按钮
          await authStore.logout()
        })
        .catch(() => {
          // 点击取消按钮，不进行任何操作
        })
      break
  }
}
</script>

<style scoped>
.books-manage-view {
  min-height: 100vh;
  background-color: var(--van-background);
}

.content {
  padding-top: 4px;
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
</style>
