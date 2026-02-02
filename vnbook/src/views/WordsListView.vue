<template>
  <div class="words-manage-view">
    <van-nav-bar :title="booksStore.currentBook?.title || '单词列表'" fixed placeholder>
      <template #left>
        <van-icon name="arrow-left" size="22" @click="onClickLeft" />
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
              <div class="icon-wrapper">
                <van-icon name="edit" class="word-edit-icon" />
              </div>
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

const onClickLeft = () => {
  router.back()
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
.words-manage-view {
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

/* 单词列表 图标优化 */
:deep(.word-edit-icon) {
  font-size: 24px;
  margin-right: 12px;
  color: var(--van-primary-color);
  display: flex;
  align-items: center;
  height: 100%;
}

/* 确保单元格内容与图标对齐 */
:deep(.van-cell) {
  align-items: center;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
}

.custom-dialog-container {
  padding: 8px 24px 24px;
}

.delete-message {
  font-size: var(--van-dialog-message-font-size);
  line-height: var(--van-dialog-message-line-height);
  color: var(--van-dialog-message-color);
  text-align: center;
  word-break: normal;
  overflow-wrap: break-word;
}
</style>
