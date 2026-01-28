<template>
  <div class="words-view">
    <van-nav-bar class="nav-bar-fixed" :title="booksStore.currentBook?.title || '单词列表'">
      <template #left>
        <van-button class="icon-btn" round size="small" icon="arrow-left" @click="goBack" />
      </template>
      <template #right>
        <van-button class="icon-btn" round size="small" icon="ellipsis" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div v-if="wordsStore.sortMode === 'alpha'">
      <van-index-bar>
        <template v-for="group in wordsStore.groupedWords" :key="group.key">
          <van-index-anchor :index="group.label" />
          <van-cell
            v-for="w in group.words"
            :key="w.Id"
            :title="w.name"
            :label="w.phon ? `[${w.phon}]` : ''"
            is-link
            @click="openWordCard(w)"
          />
        </template>
      </van-index-bar>
    </div>
    <div v-else>
      <template v-for="group in wordsStore.groupedWords" :key="group.key">
        <div class="group-title">{{ group.label }}</div>
        <van-cell-group>
          <van-cell
            v-for="w in group.words"
            :key="w.Id"
            :title="w.name"
            :label="w.phon ? `[${w.phon}]` : ''"
            is-link
            @click="openWordCard(w)"
          />
        </van-cell-group>
      </template>
    </div>

    <word-new-dialog v-model="showWordNew" :bid="bid" @save="saveWord" />

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
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useWordsStore } from '@/stores/words'
import WordNewDialog from '@/components/WordNewDialog.vue'
import type { Word, MenuAction } from '@/types'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const wordsStore = useWordsStore()

const bid = Number(route.params.bid)
const showWordNew = ref(false)
const showMenu = ref(false)
const menuActions = [
  { name: '添加单词', key: 'add' },
  { name: '切换排序', key: 'toggle' },
]

onMounted(async () => {
  if (!booksStore.currentBook) {
    // 如果从刷新进入，尝试从已加载的 books 中找到当前 book
    const loaded = await booksStore.loadBooks()
    if (loaded) {
      const b = booksStore.books.find((b) => b.Id === bid)
      if (b) booksStore.setCurrentBook(b)
    }
  }
  await wordsStore.loadWords(bid)
})

const goBack = () => router.back()
const openAddWord = () => (showWordNew.value = true)
const toggleSort = () => wordsStore.toggleSortMode()
const openMenu = () => (showMenu.value = true)
const onSelectAction = (action: MenuAction) => {
  if (action.key === 'add') {
    openAddWord()
  } else if (action.key === 'toggle') {
    toggleSort()
  }
}
const handleMenuSelect = (action: MenuAction) => onSelectAction(action)

const openWordCard = (w: Word) => {
  wordsStore.setCurrentWord(w)
  router.push(`/books/${bid}/words/${w.Id}`)
}

const saveWord = async (w: Word) => {
  // 本地查重
  const exist = wordsStore.findWordByName(w.name)
  if (exist) {
    router.push(`/books/${bid}/words/${exist.Id}`)
    return
  }
  await wordsStore.saveWord(w)
}
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
