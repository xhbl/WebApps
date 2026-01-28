<template>
  <div class="books-view">
    <van-nav-bar class="nav-bar-fixed" title="我的单词本">
      <template #left>
        <van-button class="icon-btn" round size="small" icon="search" />
      </template>
      <template #right>
        <van-button class="icon-btn" round size="small" icon="ellipsis" @click="openMenu" />
      </template>
    </van-nav-bar>

    <van-cell-group>
      <van-cell
        v-for="b in booksStore.books"
        :key="b.Id"
        :title="b.title"
        :label="`单词数：${b.nums}`"
        is-link
        @click="enterBook(b)"
      />
    </van-cell-group>

    <book-editor-dialog v-model="showEditor" :book="editorBook" @save="saveBook" />

    <user-mod-dialog v-model="showUserMod" />

    <van-action-sheet
      v-model:show="showMenu"
      :actions="menuActions"
      cancel-text="取消"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import BookEditorDialog from '@/components/BookEditorDialog.vue'
import UserModDialog from '@/components/UserModDialog.vue'
import type { Book, MenuAction } from '@/types'

const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()

const showEditor = ref(false)
const editorBook = ref<Book | null>(null)

const showUserMod = ref(false)

const showMenu = ref(false)
const menuActions = [
  { name: '新建', key: 'new' },
  { name: '修改信息', key: 'mod' },
  { name: '注销', key: 'logout' },
]

onMounted(async () => {
  await booksStore.loadBooks()
})

const openNewBook = () => {
  editorBook.value = { Id: 0, title: '', nums: 0, time_c: '', hide: 0, _new: 1 }
  showEditor.value = true
}

const openMenu = () => {
  showMenu.value = true
}

const enterBook = (b: Book) => {
  booksStore.setCurrentBook(b)
  router.push(`/books/${b.Id}/words`)
}

const saveBook = async (book: Book) => {
  const saved = await booksStore.saveBook(book)
  if (saved) {
    editorBook.value = null
  }
}

// ActionSheet 事件处理
const onSelectAction = async (action: MenuAction) => {
  if (action.key === 'new') {
    openNewBook()
  } else if (action.key === 'logout') {
    await authStore.logout()
    // logout() 会自动跳转到登录页，无需额外处理
  } else if (action.key === 'mod') {
    showUserMod.value = true
  }
}

const handleMenuSelect = (action: MenuAction) => onSelectAction(action)
</script>

<style scoped>
.books-view {
  min-height: 100vh;
  padding-top: 54px; /* 预留导航高度，避免内容被覆盖 */
  box-sizing: border-box;
}
.nav-bar-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  background: #fff;
}
.nav-bar-fixed :deep(.van-nav-bar__title) {
  font-size: 20px;
}
.icon-btn :deep(.van-icon) {
  font-size: 18px;
  font-weight: 700;
}
</style>
