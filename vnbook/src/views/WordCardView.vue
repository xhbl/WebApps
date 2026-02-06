<template>
  <div class="word-card-view">
    <van-nav-bar :title="title" :fixed="false" z-index="100">
      <template #left>
        <van-icon name="arrow-left" class="nav-bar-icon" @click="goBack" />
      </template>
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="swipe-wrap">
      <van-button
        v-if="isDesktop"
        class="nav-btn nav-prev"
        icon="arrow-left"
        round
        type="primary"
        plain
        @click="swipePrev"
      />
      <van-swipe
        ref="swipeRef"
        :initial-swipe="initialIndex"
        class="my-swipe"
        :show-indicators="true"
        @change="onChange"
      >
        <van-swipe-item v-for="w in wordsStore.words" :key="w.id">
          <div class="card">
            <div class="sticky-header">
              <div class="word-row">
                <span class="word-text">{{ w.word }}</span>
              </div>
              <div class="phon-row" v-if="w.phon" @click.stop="playAudio(w.word)">
                <van-icon name="volume-o" class="phon-icon" />
                <span class="phon-text">/{{ w.phon }}/</span>
              </div>
            </div>

            <div class="card-content">
              <div class="exps" v-if="w.explanations && w.explanations.length">
                <div class="exp-block" v-for="e in w.explanations" :key="e.id">
                  <div class="exp-header">
                    <span class="exp-pos">{{ e.pos }}</span>
                    <span class="exp-cn">{{ e.exp?.zh }}</span>
                  </div>
                  <div class="exp-en" v-if="e.exp?.en">{{ e.exp.en }}</div>
                  <div class="sens-block" v-if="e.sentences && e.sentences.length">
                    <div class="sen-item" v-for="s in e.sentences" :key="s.id">
                      <div class="sen-label">例:</div>
                      <div class="sen-content">
                        <div class="sen-en">{{ s.sen?.en }}</div>
                        <div class="sen-ch" v-if="s.sen?.zh">{{ s.sen.zh }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </van-swipe-item>
      </van-swipe>
      <van-button
        v-if="isDesktop"
        class="nav-btn nav-next"
        icon="arrow"
        round
        type="primary"
        plain
        @click="swipeNext"
      />
    </div>

    <van-action-sheet
      v-model:show="showMenu"
      :actions="menuActions"
      cancel-text="取消"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useWordsStore } from '@/stores/words'
import { showDialog } from 'vant'
import type { MenuAction } from '@/types'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const wordsStore = useWordsStore()
const swipeRef = ref()
const showMenu = ref(false)
const menuActions = [
  { name: '删除', key: 'delete' },
  { name: '编辑', key: 'edit' },
]

const wid = Number(route.params.wid)
const bid = Number(route.params.bid)

// 页面加载时确保数据已加载
onMounted(async () => {
  // 如果 words 为空，重新加载
  if (!wordsStore.words.length && !isNaN(bid)) {
    await wordsStore.loadWords(bid)
  }
  if (bid > 0 && booksStore.books.length === 0) {
    await booksStore.loadBooks()
  }
})

// 检测是否为桌面设备（非触摸屏或支持悬停）
const isDesktop = computed(() => {
  // 检测是否支持精细指针（鼠标）和悬停
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches
  const canHover = window.matchMedia('(hover: hover)').matches
  return hasFinePointer || canHover
})

const initialIndex = computed(() => {
  const idx = wordsStore.words.findIndex((w) => w.id === wid)
  return idx >= 0 ? idx : 0
})

const currentIndex = ref(initialIndex.value)

watch(initialIndex, (val) => {
  currentIndex.value = val
})

const title = computed(() => {
  let baseTitle = '单词卡片'
  if (bid === 0) {
    baseTitle = wordsStore.orphanFilter ? '未入本单词' : '全部单词'
  } else if (bid === -1) {
    baseTitle = '复习本'
  } else {
    const book = booksStore.books.find((b) => b.id === bid)
    if (book) baseTitle = book.title
  }

  if (wordsStore.words.length === 0) return baseTitle
  return `${baseTitle} (${currentIndex.value + 1}/${wordsStore.words.length})`
})

const onChange = (index: number) => {
  currentIndex.value = index
  const w = wordsStore.words[index]
  if (w) {
    wordsStore.setCurrentWord(w)
    // 更新 URL，以便刷新页面后能停留在当前单词
    router.replace(`/books/${bid}/words/${w.id}`)
  }
}

const openMenu = () => (showMenu.value = true)
const onSelectAction = async (action: MenuAction) => {
  const currentWord = wordsStore.words[currentIndex.value]
  if (!currentWord) return

  if (action.key === 'delete') {
    const isAllWords = bid === 0
    try {
      if (isAllWords) {
        if ((currentWord.book_count || 0) > 0) {
          await showDialog({
            title: '确认删除',
            message: `此单词已在 ${currentWord.book_count} 个单词本中收录，确认要删除吗？`,
            confirmButtonColor: 'var(--van-danger-color)',
          })
        }
        await showDialog({
          title: '永久删除',
          message: `删除后将无法恢复，确认删除单词"${currentWord.word}"吗？`,
          confirmButtonColor: 'var(--van-danger-color)',
        })
      } else {
        await showDialog({
          title: '确认移除',
          message: `确定要从当前单词本移除单词"${currentWord.word}"吗？`,
          confirmButtonColor: 'var(--van-warning-color)',
          confirmButtonText: '移除',
        })
      }
      if (await wordsStore.deleteWords([currentWord], bid)) {
        router.back()
      }
    } catch {
      // Cancelled
    }
  } else if (action.key === 'edit') {
    // 编辑功能通常在列表页或通过弹窗实现，此处暂留空或跳转
  }
}
const handleMenuSelect = (action: MenuAction) => onSelectAction(action)

const playAudio = (text: string) => {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text)
    msg.lang = 'en-US'
    const voices = window.speechSynthesis.getVoices()
    const usVoice = voices.find((voice) => voice.lang === 'en-US')
    if (usVoice) {
      msg.voice = usVoice
    }
    window.speechSynthesis.speak(msg)
  }
}

const goBack = () => router.back()
const swipePrev = () => swipeRef.value?.prev()
const swipeNext = () => swipeRef.value?.next()
</script>

<style scoped>
.word-card-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: var(--van-gray-1);
}
:deep(.van-nav-bar__title) {
  font-size: var(--van-font-size-lg);
}

.van-icon {
  font-weight: 700;
  cursor: pointer;
}

.nav-bar-icon {
  font-size: 22px;
}

.swipe-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.my-swipe {
  height: 100%;
}
:deep(.van-swipe-item) {
  height: 100%;
  overflow-y: auto;
}
:deep(.van-swipe__indicators) {
  bottom: 12px;
}
.card {
  padding: 0;
  min-height: 100%;
  box-sizing: border-box;
}
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--van-nav-bar-background);
  padding: 8px 10px 6px 16px;
}
.card-content {
  padding: 5px 16px 50px 16px;
}
.word-row {
  margin-bottom: 2px;
}
.word-text {
  font-weight: bold;
  font-size: calc(var(--van-font-size-xl) + 2px);
  color: var(--van-text-color);
}
.phon-row {
  display: flex;
  align-items: center;
  margin-bottom: 0;
  color: var(--van-gray-6);
  font-size: var(--van-font-size-md);
  cursor: pointer;
}
.phon-icon {
  margin-right: 4px;
  color: var(--van-primary-color);
}
.exp-block {
  background-color: var(--van-gray-2);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
}
.exp-header {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 4px;
  font-size: var(--van-font-size-md);
}
.exp-pos {
  font-weight: bold;
  margin-right: 8px;
}
.exp-en {
  font-size: var(--van-font-size-md);
  color: var(--van-gray-6);
  margin-bottom: 4px;
  line-height: 1.4;
}
.sen-item {
  display: flex;
  font-size: var(--van-font-size-sm);
  margin-top: 4px;
  line-height: 1.4;
}
.sen-label {
  margin-right: 4px;
  white-space: nowrap;
  color: var(--van-gray-6);
}
.sen-content {
  flex: 1;
}
.sen-en {
  color: var(--van-text-color);
}
.sen-ch {
  color: var(--van-gray-6);
  margin-top: 2px;
}
.nav-btn {
  position: absolute;
  top: auto;
  bottom: 20px;
  transform: scale(0.75);
  z-index: 10;
  display: inline-flex;
  padding: 0 10px;
  backdrop-filter: blur(6px);
}
.nav-prev {
  left: 6px;
}
.nav-next {
  right: 6px;
}
</style>
