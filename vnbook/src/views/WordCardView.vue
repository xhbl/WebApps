<template>
  <div class="word-card-view" @click="closeAllPopovers">
    <van-nav-bar :title="title" :fixed="false" z-index="100">
      <template #left>
        <van-icon name="arrow-left" class="nav-bar-icon" @click="goBack" />
      </template>
      <template #right>
        <van-icon
          name="edit"
          class="nav-bar-icon"
          :class="{ active: isEditMode }"
          @click="toggleEditMode"
        />
      </template>
    </van-nav-bar>

    <div class="swipe-wrap">
      <van-button
        v-if="isDesktop && !isSingleMode"
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
        :show-indicators="!isSingleMode"
        @change="onChange"
      >
        <van-swipe-item v-for="w in cardList" :key="w.id">
          <div class="card">
            <div class="sticky-header van-hairline--bottom">
              <div class="word-row">
                <span class="word-text">{{ w.word }}</span>
              </div>
              <div class="phon-row" v-if="w.phon" @click.stop="playAudio(w.word)">
                <van-icon name="volume-o" class="phon-icon" />
                <span class="phon-text">/{{ w.phon }}/</span>
              </div>
              <div v-if="isEditMode" class="edit-float-icon word-edit" @click.stop>
                <van-popover
                  v-model:show="popoverMap['word-' + w.id]"
                  :actions="wordActions"
                  placement="bottom-end"
                  @select="(action) => onWordAction(action, w)"
                  @open="onPopoverOpen('word-' + w.id)"
                >
                  <template #reference>
                    <van-icon name="edit" />
                  </template>
                </van-popover>
              </div>
            </div>

            <div class="card-content">
              <div class="exps" v-if="w.explanations && w.explanations.length">
                <div
                  class="exp-item van-hairline--bottom"
                  v-for="(e, index) in w.explanations"
                  :key="e.id"
                >
                  <div class="exp-header">
                    <span class="exp-pos">{{ e.pos }}</span>
                    <span class="exp-cn">{{ e.exp?.zh }}</span>
                  </div>
                  <div class="exp-en" v-if="e.exp?.en">{{ e.exp.en }}</div>
                  <div v-if="isEditMode" class="edit-float-icon exp-edit" @click.stop>
                    <van-popover
                      v-model:show="popoverMap['exp-' + e.id]"
                      :actions="getExpActions(e, w)"
                      :placement="getPopoverPlacement(index, w.explanations.length)"
                      @select="(action) => onExpAction(action, e, w)"
                      @open="onPopoverOpen('exp-' + e.id)"
                    >
                      <template #reference>
                        <van-icon name="edit" />
                      </template>
                    </van-popover>
                  </div>
                  <div class="sens-block" v-if="e.sentences && e.sentences.length">
                    <div class="sen-item" v-for="s in e.sentences" :key="s.id">
                      <div class="sen-label">
                        <van-icon name="guide-o" />
                      </div>
                      <div class="sen-content">
                        <div class="sen-en">{{ s.sen?.en }}</div>
                        <div class="sen-ch" v-if="s.sen?.zh">{{ s.sen.zh }}</div>
                        <div class="sen-memo" v-if="s.smemo">[{{ s.smemo }}]</div>
                      </div>
                      <div v-if="isEditMode" class="edit-float-icon sen-edit" @click.stop>
                        <van-popover
                          v-model:show="popoverMap['sen-' + s.id]"
                          :actions="getSenActions(s, e)"
                          placement="bottom-end"
                          @select="(action) => onSenAction(action, s, e)"
                          @open="onPopoverOpen('sen-' + s.id)"
                        >
                          <template #reference>
                            <van-icon name="edit" />
                          </template>
                        </van-popover>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="empty-exps" v-else>
                尚未在单词本中添加释义例句内容，请点击右上方图标进入编辑模式添加。
              </div>

              <div class="dict-section-wrapper" v-if="w.baseInfo?.definitions?.length">
                <div class="dict-tabs" v-if="showDict">
                  <div class="dict-float-icon" @click.stop="showDict = false">
                    <van-icon name="closed-eye" />
                  </div>
                  <van-tabs
                    v-model:active="activeTab"
                    shrink
                    background="transparent"
                    :border="false"
                    line-width="0px"
                    color="var(--van-primary-color)"
                  >
                    <van-tab title="基本词典">
                      <div class="dict-content-box">
                        <div
                          v-for="(item, idx) in getDictZh(w.baseInfo.definitions)"
                          :key="'zh' + idx"
                          class="dict-item"
                        >
                          <span class="dict-pos">{{ item.pos }}</span>
                          <span class="dict-text-zh">{{ item.text }}</span>
                        </div>
                        <div
                          v-for="(item, idx) in getDictEn(w.baseInfo.definitions)"
                          :key="'en' + idx"
                          class="dict-item"
                        >
                          <span class="dict-pos">{{ item.pos }}</span>
                          <span class="dict-text-en">{{ item.text }}</span>
                        </div>
                      </div>
                    </van-tab>
                    <!-- <van-tab title="其它词典"></van-tab> -->
                  </van-tabs>
                </div>
                <div v-else class="dict-collapsed" @click="showDict = true">
                  <span class="dict-collapsed-text">显示词典信息</span>
                </div>
              </div>
            </div>
          </div>
        </van-swipe-item>
      </van-swipe>
      <van-button
        v-if="isDesktop && !isSingleMode"
        class="nav-btn nav-next"
        icon="arrow"
        round
        type="primary"
        plain
        @click="swipeNext"
      />
    </div>

    <word-editor-dialog
      v-model="showWordEditor"
      :bid="bid"
      :word="editingWord"
      :mode="wordEditorMode"
      @update:word="editingWord = $event"
    />
    <exp-editor-dialog
      v-model="showExpEditor"
      :wid="editingExp?.word_id || 0"
      :explanation="editingExp"
      @save="onSaveExp"
    />
    <sen-editor-dialog
      v-model="showSenEditor"
      :eid="editingSen?.exp_id || 0"
      :sentence="editingSen"
      @save="onSaveSen"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useWordsStore } from '@/stores/words'
import type { BaseDictDefinition, Word, Explanation, Sentence } from '@/types'
import WordEditorDialog from '@/components/WordEditorDialog.vue'
import ExpEditorDialog from '@/components/ExpEditorDialog.vue'
import SenEditorDialog from '@/components/SenEditorDialog.vue'
import { usePopoverMap } from '@/composables/usePopoverMap'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const wordsStore = useWordsStore()
const swipeRef = ref()
const activeTab = ref(0)
const showDict = ref(true)
const { popoverMap, onOpen: onPopoverOpen, closeAll: closeAllPopovers } = usePopoverMap()

const wid = Number(route.params.wid)
const bid = Number(route.params.bid)

const isSingleMode = computed(() => route.query.single === 'true')
const autoEdit = computed(() => route.query.edit === 'true')

// 页面加载时确保数据已加载
onMounted(async () => {
  // 如果 words 为空，重新加载
  if (!wordsStore.words.length && !isNaN(bid)) {
    await wordsStore.loadWords(bid)
  }
  if (bid > 0 && booksStore.books.length === 0) {
    await booksStore.loadBooks()
  }
  if (autoEdit.value) {
    isEditMode.value = true
  }
})

// 检测是否为桌面设备（非触摸屏或支持悬停）
const isDesktop = computed(() => {
  // 检测是否支持精细指针（鼠标）和悬停
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches
  const canHover = window.matchMedia('(hover: hover)').matches
  return hasFinePointer || canHover
})

const cardList = computed(() => {
  if (isSingleMode.value) {
    const w = wordsStore.words.find((w) => w.id === wid)
    return w ? [w] : []
  }
  return wordsStore.words
})

const initialIndex = computed(() => {
  if (isSingleMode.value) return 0
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
  if (isSingleMode.value) return baseTitle
  return `${baseTitle} (${currentIndex.value + 1}/${wordsStore.words.length})`
})

const onChange = (index: number) => {
  currentIndex.value = index
  const w = cardList.value[index]
  if (w) {
    wordsStore.setCurrentWord(w)
    // 更新 URL，以便刷新页面后能停留在当前单词
    router.replace({
      path: `/books/${bid}/words/${w.id}`,
      query: route.query,
    })
  }
}

const isEditMode = ref(false)
const showWordEditor = ref(false)
const showExpEditor = ref(false)
const showSenEditor = ref(false)
const editingWord = ref<Word | null>(null)
const editingExp = ref<Explanation | null>(null)
const editingSen = ref<Sentence | null>(null)
const wordEditorMode = ref<'full' | 'phon'>('full')

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
}

const playAudio = (word: string) => {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(word)
    msg.lang = 'en-US'
    const voices = window.speechSynthesis.getVoices()
    const usVoice = voices.find((voice) => voice.lang === 'en-US')
    if (usVoice) {
      msg.voice = usVoice
    }
    window.speechSynthesis.speak(msg)
  }
}

const onEditExp = (e: Explanation) => {
  editingExp.value = e
  showExpEditor.value = true
}

const onEditSen = (s: Sentence) => {
  editingSen.value = s
  showSenEditor.value = true
}

const onAddExp = (wordId: number) => {
  editingExp.value = {
    id: 0,
    word_id: wordId,
    pos: '',
    exp: { en: '', zh: '' },
    time_c: '',
    _new: 1,
  }
  showExpEditor.value = true
}

const onAddSen = (expId: number) => {
  editingSen.value = {
    id: 0,
    exp_id: expId,
    sen: { en: '', zh: '' },
    time_c: '',
    _new: 1,
  }
  showSenEditor.value = true
}

const onSaveExp = async (exp: Explanation) => {
  await wordsStore.saveExplanation(exp)
}

const onSaveSen = async (sen: Sentence) => {
  await wordsStore.saveSentence(sen, sen.exp_id)
}

const wordActions = [
  { text: '添加释义', icon: 'plus', key: 'add-exp' },
  { text: '编辑音标', icon: 'certificate', key: 'edit-phon' },
]

const onWordAction = (action: { key: string }, w: Word) => {
  closeAllPopovers()
  if (action.key === 'add-exp') {
    onAddExp(w.id)
  } else if (action.key === 'edit-phon') {
    editingWord.value = w
    wordEditorMode.value = 'phon'
    showWordEditor.value = true
  }
}

const getExpActions = (exp: Explanation, word: Word) => {
  const actions: { text: string; icon: string; key: string }[] = [
    { text: '添加例句', icon: 'plus', key: 'add-sen' },
    { text: '编辑释义', icon: 'edit', key: 'edit-exp' },
  ]
  const exps = word.explanations || []
  const index = exps.findIndex((e) => e.id === exp.id)

  if (index > 0) actions.push({ text: '上移', icon: 'arrow-up', key: 'move-up' })
  if (index < exps.length - 1) actions.push({ text: '下移', icon: 'arrow-down', key: 'move-down' })
  return actions
}

const getSenActions = (sen: Sentence, exp: Explanation) => {
  const actions: { text: string; icon: string; key: string }[] = [
    { text: '编辑例句', icon: 'edit', key: 'edit-sen' },
  ]
  const sens = exp.sentences || []
  const index = sens.findIndex((s) => s.id === sen.id)

  if (index > 0) actions.push({ text: '上移', icon: 'arrow-up', key: 'move-up' })
  if (index < sens.length - 1) actions.push({ text: '下移', icon: 'arrow-down', key: 'move-down' })
  return actions
}

const onSenAction = (action: { key: string }, sen: Sentence, exp: Explanation) => {
  closeAllPopovers()
  if (action.key === 'edit-sen') {
    onEditSen(sen)
  } else if (action.key === 'move-up') {
    wordsStore.moveSentence(exp.id, sen.id, -1)
  } else if (action.key === 'move-down') {
    wordsStore.moveSentence(exp.id, sen.id, 1)
  }
}

const onExpAction = (action: { key: string }, exp: Explanation, word: Word) => {
  closeAllPopovers()
  if (action.key === 'add-sen') {
    onAddSen(exp.id)
  } else if (action.key === 'edit-exp') {
    onEditExp(exp)
  } else if (action.key === 'move-up') {
    wordsStore.moveExplanation(word.id, exp.id, -1)
  } else if (action.key === 'move-down') {
    wordsStore.moveExplanation(word.id, exp.id, 1)
  }
}

const getPopoverPlacement = (index: number, total: number) => {
  if (total > 3 && index >= total - 1) {
    return 'top-end'
  }
  return 'bottom-end'
}

const getDictZh = (defs: BaseDictDefinition[]) => {
  return defs
    .map((d) => {
      const text = d.meanings?.zh?.join('；')
      return text ? { pos: d.pos, text } : null
    })
    .filter((item): item is { pos: string; text: string } => item !== null)
}

const getDictEn = (defs: BaseDictDefinition[]) => {
  const list: { pos: string; text: string }[] = []
  defs.forEach((d) => {
    if (d.meanings?.en) {
      d.meanings.en.forEach((text) => {
        if (text) list.push({ pos: d.pos, text })
      })
    }
  })
  return list
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
  background-color: var(--van-background);
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
  padding: 4px;
  border-radius: 4px;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.nav-bar-icon.active {
  background-color: var(--van-nav-bar-icon-color);
  color: #fff;
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
  padding: 4px 16px 30px 16px;
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
.empty-exps {
  padding: 12px 0 0;
  color: var(--van-text-color-3);
  font-size: var(--van-font-size-md);
  text-align: center;
}
.exp-item {
  position: relative;
  padding: 7px 0;
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
  color: var(--van-text-color-2);
  margin-bottom: 4px;
  line-height: 1.4;
}
.sen-item {
  display: flex;
  position: relative;
  font-size: var(--van-font-size-sm);
  margin-top: 4px;
  line-height: 1.4;
}
.sen-label {
  margin-right: 4px;
  white-space: nowrap;
  color: var(--van-text-color-2);
}
.sen-content {
  flex: 1;
}
.sen-en {
  color: var(--van-text-color);
}
.sen-ch {
  color: var(--van-text-color-2);
  margin-top: 2px;
}
.sen-memo {
  color: var(--van-gray-5);
  font-size: var(--van-font-size-xs);
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

.dict-tabs {
  margin-top: 16px;
  position: relative;
  --van-tabs-line-height: 30px;
}
:deep(.van-tabs__nav) {
  background-color: transparent;
  padding-left: 0;
}
:deep(.van-tab) {
  padding: 0 16px 0 0;
}
:deep(.van-tab--active) {
  font-size: var(--van-font-size-sm);
  font-weight: bold;
}
.dict-content-box {
  padding: 5px 0;
}
.dict-item {
  margin-bottom: 6px;
  font-size: var(--van-font-size-sm);
  line-height: 1.4;
}
.dict-pos {
  font-weight: bold;
  margin-right: 8px;
}
.dict-text-zh {
  color: var(--van-text-color);
}
.dict-text-en {
  color: var(--van-text-color-2);
}
.dict-float-icon {
  position: absolute;
  right: 0;
  top: 0;
  padding: 8px;
  color: var(--van-gray-5);
  cursor: pointer;
  z-index: 10;
  font-size: 18px;
}
.dict-collapsed {
  margin-top: 16px;
  padding: 10px 0;
  text-align: center;
  color: var(--van-gray-5);
  font-size: var(--van-font-size-sm);
  cursor: pointer;
}

.edit-float-icon {
  position: absolute;
  right: 0;
  top: 0;
  padding: 4px;
  color: var(--van-primary-color);
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  cursor: pointer;
  z-index: 5;
  font-size: 18px;
}
.word-edit {
  top: 12px;
  right: 16px;
}
.exp-edit {
  top: 8px;
  right: 0;
}
.sen-edit {
  top: -2px;
  right: 0;
  font-size: 16px;
}
</style>
