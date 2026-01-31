<template>
  <div class="words-manage-view">
    <van-nav-bar :title="booksStore.currentBook?.title || '单词列表'" fixed placeholder>
      <template #left>
        <van-icon name="plus" size="22" @click="openAddWord" />
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
            v-for="w in wordsStore.words"
            :key="w.id"
            :title="w.word"
            :label="w.phon ? `[${w.phon}]` : ''"
            is-link
            @click="openWordCard(w)"
          >
            <template #icon>
              <van-icon name="edit" class="word-edit-icon" />
            </template>
          </van-cell>
          <van-empty
            v-if="wordsStore.words.length === 0"
            description="暂无单词，点击左上角➕新建"
          />
        </div>
      </van-pull-refresh>
    </div>

    <AppMenu />
    <word-new-dialog v-model="showWordNew" :bid="bid" />
    <van-dialog
      v-model:show="showDeleteDialog"
      :title="deleteDialogTitle"
      show-cancel-button
      confirm-button-text="删除"
      confirm-button-color="var(--van-danger-color)"
      cancel-button-text="取消"
      @confirm="onConfirmDeleteWord"
    >
      <div class="custom-dialog-container">
        <div class="delete-message">
          {{ deleteDialogMessage }}
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useWordsStore, type WordsStore } from '@/stores/words'
import { useAppMenu } from '@/composables/useAppMenu'
import WordNewDialog from '@/components/WordNewDialog.vue'
import type { Word } from '@/types'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const wordsStore: WordsStore = useWordsStore()

const bid = Number(route.params.bid)
const showWordNew = ref(false)
const refreshing = ref(false)
const loading = ref(true)
const showDeleteDialog = ref(false)
const deleteDialogTitle = ref('')
const deleteDialogMessage = ref('')
let pendingDeleteWord: Word | null = null

onMounted(async () => {
  loading.value = true
  if (!booksStore.currentBook) {
    const loaded = await booksStore.loadBooks()
    if (loaded) {
      const b = booksStore.books.find((b) => b.id === bid)
      if (b) booksStore.setCurrentBook(b)
    }
  }
  await wordsStore.loadWords(bid)
  loading.value = false
})

const onRefresh = async () => {
  refreshing.value = true
  await wordsStore.loadWords(bid)
  refreshing.value = false
}

const openAddWord = () => {
  showWordNew.value = true
}

const onConfirmDeleteWord = async () => {
  if (!pendingDeleteWord) return
  await wordsStore.deleteWord(pendingDeleteWord)
  // editorWord.value = null
  showDeleteDialog.value = false
  pendingDeleteWord = null
  await wordsStore.loadWords(bid)
}

const openWordCard = (w: Word) => {
  wordsStore.setCurrentWord(w)
  router.push(`/books/${bid}/words/${w.id}`)
}

const { openMenu, AppMenu } = useAppMenu({
  showUser: false,
  showLogout: false,
  items: [{ name: '添加单词', icon: 'plus', handler: openAddWord }],
})
</script>

<style scoped>
.words-view {
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
.group-title {
  padding: 8px 12px;
  color: #969799;
  font-size: 14px;
}
</style>
