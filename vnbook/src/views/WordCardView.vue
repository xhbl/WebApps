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
          :class="{
            active: isEditMode,
            disabled: isReviewMode && !showAnswer && currentStatus === 0,
          }"
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
      <van-button
        v-if="isDesktop && !isSingleMode"
        class="nav-btn nav-next"
        icon="arrow"
        round
        type="primary"
        plain
        @click="swipeNext"
      />
      <van-swipe
        ref="swipeRef"
        :initial-swipe="initialIndex"
        class="my-swipe"
        :show-indicators="!isSingleMode"
        @change="onChange"
      >
        <van-swipe-item v-for="w in cardList" :key="w.id">
          <van-pull-refresh v-model="refreshing" style="min-height: 100%" @refresh="onRefresh">
            <div class="card">
              <div class="sticky-header van-hairline--bottom">
                <div class="word-row">
                  <span class="word-text">{{ w.word }}</span>
                  <van-icon
                    name="bookmark-o"
                    class="bookmark-icon"
                    :class="{
                      hidden: isEditMode || bid === -1,
                      active: w.in_review,
                    }"
                    @click.stop="toggleReview(w)"
                  />
                </div>
                <div
                  class="phon-row"
                  v-if="w.phon"
                  @click.stop="playPronunciation(w.word, w.audio_url)"
                >
                  <van-icon
                    name="volume-o"
                    class="phon-icon"
                    :class="{ loading: loadingWord === w.word }"
                  />
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

              <div class="card-content" :class="{ 'review-padding': isReviewMode }">
                <div class="review-content-wrapper" style="position: relative">
                  <div
                    v-if="isReviewMode && !showAnswer && currentStatus === 0"
                    class="review-mask"
                    @click.stop="revealAnswer"
                  >
                    <div class="mask-hint">点击显示释义</div>
                  </div>
                  <div
                    :class="{ 'review-hidden': isReviewMode && !showAnswer && currentStatus === 0 }"
                  >
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

                    <div class="dict-section-wrapper">
                      <div class="dict-tabs" v-if="showDict">
                        <div class="dict-float-icon" @click.stop="showDict = false">
                          <van-icon name="closed-eye" />
                        </div>
                        <div class="dict-header">
                          <span class="dict-title-text">基本词典</span>
                          <span
                            v-for="d in visibleExternalDicts"
                            :key="d.name"
                            class="ext-dict-link"
                            @click.stop="openExternalDict(d)"
                          >
                            {{ d.name }}
                          </span>
                          <span @click.stop v-if="hasVisibleOnlineDicts">
                            <van-popover
                              v-model:show="popoverMap.onlineDict"
                              :actions="onlineDictActions"
                              placement="bottom-end"
                              :teleport="null"
                              @select="openExternalDict"
                              @open="onPopoverOpen('onlineDict')"
                            >
                              <template #reference>
                                <span class="ext-dict-link">网络</span>
                              </template>
                            </van-popover>
                          </span>
                        </div>
                        <div class="dict-content-box" v-if="w.baseInfo?.definitions?.length">
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
                        <div class="dict-empty-content" v-else>暂无基本词典释义</div>
                      </div>
                      <div v-else class="dict-collapsed" @click="showDict = true">
                        <span class="dict-collapsed-text">显示词典信息</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </van-pull-refresh>
        </van-swipe-item>
      </van-swipe>

      <div v-if="isReviewMode" class="review-footer safe-area-bottom">
        <!-- Status 0: 未复习 -->
        <template v-if="currentStatus === 0">
          <div class="review-btn unknown" @click="onReviewResult(1)">
            <van-icon name="cross" class="btn-icon" />
            <span>不认识</span>
          </div>
          <div class="review-btn known" @click="onReviewResult(2)">
            <van-icon name="success" class="btn-icon" />
            <span>认识</span>
          </div>
        </template>

        <!-- Status 1: 不认识 (左侧灰色不认识，右侧下一个) -->
        <template v-else-if="currentStatus === 1">
          <div class="review-btn unknown disabled">
            <van-icon name="cross" class="btn-icon" />
            <span>不认识</span>
          </div>
          <div class="review-btn next" @click="swipeNextReview">
            <span>下一个</span>
            <van-icon name="arrow" class="btn-icon-right" />
          </div>
        </template>

        <!-- Status 2: 认识 (左侧灰色认识，右侧下一个) -->
        <template v-else-if="currentStatus === 2">
          <div class="review-btn known disabled">
            <van-icon name="success" class="btn-icon" />
            <span>认识</span>
          </div>
          <div class="review-btn next" @click="swipeNextReview">
            <span>下一个</span>
            <van-icon name="arrow" class="btn-icon-right" />
          </div>
        </template>

        <!-- Status 3: Mastered (已达标) -->
        <template v-else-if="currentStatus === 3">
          <div class="review-btn mastered disabled">
            <van-icon name="medal" class="btn-icon" />
            <span>已掌握</span>
          </div>
          <div class="review-btn next" @click="swipeNextReview">
            <span>下一个</span>
            <van-icon name="arrow" class="btn-icon-right" />
          </div>
        </template>
      </div>
    </div>

    <!-- Review Stats Overlay -->
    <!-- 显示逻辑：复习模式且当前单词已复习（status > 0），或者已掌握（status == 3） -->
    <!-- 注意：status > 0 意味着已经点击了认识/不认识，遮罩已移除 -->
    <div v-if="isReviewMode && currentStatus > 0" class="review-stats-overlay">
      <div class="stat-item unknown">
        <van-icon name="cross" />
        <span class="stat-label">不认识:</span>
        <span class="stat-value">{{ currentWord?.n_unknown || 0 }}</span>
      </div>
      <div class="stat-item known">
        <van-icon name="success" />
        <span class="stat-label">认识:</span>
        <span class="stat-value">{{ currentWord?.n_known || 0 }}</span>
      </div>
      <div class="stat-item streak">
        <van-icon name="fire" />
        <span class="stat-label">连续:</span>
        <span class="stat-value">{{ currentWord?.n_streak || 0 }}/{{ targetStreak }}</span>
      </div>
    </div>

    <word-editor-dialog
      v-model="showWordEditor"
      :bid="bid"
      :word="editingWord"
      v-model:mode="wordEditorMode"
      @update:word="editingWord = $event"
    />
    <exp-editor-dialog
      v-model="showExpEditor"
      :wid="editingExp?.word_id || 0"
      :explanation="editingExp"
      @update:explanation="editingExp = $event"
    />
    <sen-editor-dialog
      v-model="showSenEditor"
      :eid="editingSen?.exp_id || 0"
      :sentence="editingSen"
      @update:sentence="editingSen = $event"
    />

    <!-- Mastered Animation Overlay -->
    <transition name="fade">
      <div v-if="showMasteredAnimation" class="mastered-animation-overlay">
        <div class="mastered-content">
          <van-icon name="medal" class="mastered-icon" />
          <div class="mastered-text">已掌握单词</div>
          <div class="mastered-word">{{ currentWord?.word }}</div>
        </div>
      </div>
    </transition>
    <!-- External Dictionary Popup -->
    <external-dict-dialog
      v-model="showDictPopup"
      :name="currentDictName"
      :url="currentDictUrl"
      :margin="currentDictMargin"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useWordsStore } from '@/stores/words'
import type { BaseDictDefinition, Word, Explanation, Sentence } from '@/types'
import WordEditorDialog from '@/components/WordEditorDialog.vue'
import ExpEditorDialog from '@/components/ExpEditorDialog.vue'
import SenEditorDialog from '@/components/SenEditorDialog.vue'
import ExternalDictDialog from '@/components/ExternalDictDialog.vue'
import { usePopoverMap } from '@/composables/usePopoverMap'
import { useWordOperations } from '@/composables/useWordOperations'
import { usePronunciation } from '@/composables/usePronunciation'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()
const wordsStore = useWordsStore()
const { play: playPronunciation, loadingWord } = usePronunciation()
const {
  handleAddToReview,
  handleRemoveFromReview,
  showExpEditor,
  editingExp,
  openAddExp: onAddExp,
  openEditExp: onEditExp,
  handleDeleteExp,
  handleMoveExp,
  showSenEditor,
  editingSen,
  openAddSen: onAddSen,
  openEditSen: onEditSen,
  handleDeleteSen,
  handleMoveSen,
} = useWordOperations()
const swipeRef = ref()
const showDict = ref(authStore.userInfo?.cfg?.showDict !== false)
const refreshing = ref(false)
const showMasteredAnimation = ref(false)
const { popoverMap, onOpen: onPopoverOpen, closeAll: closeAllPopovers } = usePopoverMap()

const wid = Number(route.params.wid)
const bid = Number(route.params.bid)
const isReviewMode = computed(() => {
  // 必须是复习本
  if (bid !== -1) return false
  // 如果是单页模式（无论是否处于编辑状态），都视为普通视图（非复习模式）
  if (route.query.single === 'true') return false
  // 其它情况（包括复习过程中的临时编辑）均保持复习模式逻辑
  return true
})
const showAnswer = ref(false)
const isMastered = (w: Word | undefined) => {
  if (!w) return false
  const targetStreak = Number(authStore.userInfo?.cfg?.targetStreak || 3)
  return (w.n_streak || 0) >= targetStreak
}

const currentStatus = computed(() => {
  const w = cardList.value[currentIndex.value]
  if (isReviewMode.value && isMastered(w)) {
    return 3 // Status 3: Mastered
  }
  return w?.last_status ?? 0
})

const toggleReview = async (w: Word) => {
  if (w.in_review) {
    await handleRemoveFromReview(w, false)
  } else {
    await handleAddToReview(w, false)
  }
}

const isSingleMode = computed(() => route.query.single === 'true')
const autoEdit = computed(() => route.query.edit === 'true')

watch(showDict, (val) => {
  authStore.updateUserConfig({ showDict: val })
})

// 页面加载时确保数据已加载
onMounted(async () => {
  // 检查数据有效性：
  // 1. Store 中的书 ID 必须与当前路由匹配
  // 2. 如果不是空列表，必须包含当前查看的单词（防止数据过时）
  // 3. 列表不能为空（除非本来就没数据，但 loadWords 会处理）
  const isBookMismatch = wordsStore.currentBookId !== bid
  const isWordMissing =
    !isSingleMode.value &&
    wordsStore.words.length > 0 &&
    !wordsStore.words.some((w) => w.id === wid)
  const isEmpty = wordsStore.words.length === 0

  if ((isBookMismatch || isWordMissing || isEmpty) && !isNaN(bid)) {
    await wordsStore.loadWords(bid)
  }

  // 确保在复习本且有内容时，若进入时 store 为空被刷新了，需要重新检查
  if (bid > 0 && booksStore.books.length === 0) {
    await booksStore.loadBooks()
  }
  if (autoEdit.value) {
    isEditMode.value = true
  }

  // 初始化更新断点：如果当前进入的单词是有效的待复习词，则记录为断点
  if (isReviewMode.value) {
    const w = wordsStore.words.find((w) => w.id === wid)
    // 仅当单词存在、未掌握且状态为“待复习”时更新断点
    // 允许用户查看已复习的单词而不丢失进度
    if (w && !isMastered(w) && (w.last_status || 0) === 0) {
      authStore.updateUserConfig({ lastReviewID: w.id })
    }
  }
})

// 检测是否为纯桌面设备（无触摸屏）
const isDesktop = computed(() => {
  // 只要设备支持触摸（maxTouchPoints > 0），就认为可以使用滑动手势，不显示导航按钮
  // 这样可以排除手机、平板以及带触摸屏的笔记本
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  return !isTouch
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

const currentWord = computed(() => cardList.value[currentIndex.value])
const targetStreak = computed(() => Number(authStore.userInfo?.cfg?.targetStreak || 3))

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
  // 必须重置 showAnswer，否则如果上一个单词被手动点开了（showAnswer=true），
  // 滑到下一个 currentStatus===0 的单词时，showAnswer 依然是 true，导致遮罩不显示
  showAnswer.value = false
  const w = cardList.value[index]
  if (w) {
    wordsStore.setCurrentWord(w)
    // Prepare new query
    const newQuery = { ...route.query }
    // 如果在复习本中滑动，且不是单页模式
    // 且即将进入的单词有遮罩（未掌握且状态为0），则强制退出编辑模式
    if (bid === -1 && !isSingleMode.value && newQuery.edit) {
      const willHaveMask = !isMastered(w) && (w.last_status || 0) === 0
      if (willHaveMask) {
        delete newQuery.edit
        isEditMode.value = false
      }
    }

    // Update URL
    router.replace({
      path: `/books/${bid}/words/${w.id}`,
      query: newQuery,
    })
    // Update Review Progress (Breakpoint)
    // Only update breakpoint if the word is pending review and not mastered
    if (isReviewMode.value && !isMastered(w) && (w.last_status || 0) === 0) {
      authStore.updateUserConfig({ lastReviewID: w.id })
    }
  }
}

const onRefresh = async () => {
  const currentId = wordsStore.currentWord?.id
  await wordsStore.loadWords(bid)
  refreshing.value = false

  if (currentId && !isSingleMode.value) {
    const newIndex = wordsStore.words.findIndex((w) => w.id === currentId)
    if (newIndex >= 0) {
      nextTick(() => swipeRef.value?.swipeTo(newIndex, { immediate: true }))
    }
  }
}

const isEditMode = ref(false)
const showWordEditor = ref(false)
const editingWord = ref<Word | null>(null)
const wordEditorMode = ref<'full' | 'phon'>('full')

const toggleEditMode = () => {
  if (isReviewMode.value && !showAnswer.value && currentStatus.value === 0) return
  isEditMode.value = !isEditMode.value
  const query = { ...route.query }
  if (isEditMode.value) {
    query.edit = 'true'
  } else {
    delete query.edit
  }
  router.replace({ query })
}

const wordActions = [
  { text: '添加释义', icon: 'plus', key: 'add-exp' },
  { text: '编辑音标', icon: 'certificate', key: 'edit-phon' },
]

const onWordAction = async (action: { key: string }, w: Word) => {
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
  const actions: { text: string; icon: string; key: string; color?: string }[] = [
    { text: '添加例句', icon: 'plus', key: 'add-sen' },
    { text: '编辑释义', icon: 'edit', key: 'edit-exp' },
    {
      text: '删除释义',
      icon: 'delete-o',
      key: 'delete',
      color: 'var(--van-danger-color)',
    },
  ]
  const exps = word.explanations || []
  const index = exps.findIndex((e) => e.id === exp.id)

  if (index > 0) actions.push({ text: '上移', icon: 'arrow-up', key: 'move-up' })
  if (index < exps.length - 1) actions.push({ text: '下移', icon: 'arrow-down', key: 'move-down' })
  return actions
}

const onExpAction = async (action: { key: string }, exp: Explanation, w: Word) => {
  closeAllPopovers()
  if (action.key === 'add-sen') {
    onAddSen(exp.id)
  } else if (action.key === 'edit-exp') {
    onEditExp(exp)
  } else if (action.key === 'delete') {
    handleDeleteExp(exp)
  } else if (action.key === 'move-up') {
    handleMoveExp(w.id, exp.id, -1)
  } else if (action.key === 'move-down') {
    handleMoveExp(w.id, exp.id, 1)
  }
}

const getSenActions = (sen: Sentence, exp: Explanation) => {
  const actions: { text: string; icon: string; key: string; color?: string }[] = [
    { text: '编辑例句', icon: 'edit', key: 'edit-sen' },
    {
      text: '删除例句',
      icon: 'delete-o',
      key: 'delete',
      color: 'var(--van-danger-color)',
    },
  ]
  const sens = exp.sentences || []
  const index = sens.findIndex((s) => s.id === sen.id)

  if (index > 0) actions.push({ text: '上移', icon: 'arrow-up', key: 'move-up' })
  if (index < sens.length - 1) actions.push({ text: '下移', icon: 'arrow-down', key: 'move-down' })
  return actions
}

const onSenAction = async (action: { key: string }, sen: Sentence, exp: Explanation) => {
  closeAllPopovers()
  if (action.key === 'edit-sen') {
    onEditSen(sen)
  } else if (action.key === 'delete') {
    handleDeleteSen(sen, exp.id)
  } else if (action.key === 'move-up') {
    handleMoveSen(exp.id, sen.id, -1)
  } else if (action.key === 'move-down') {
    handleMoveSen(exp.id, sen.id, 1)
  }
}

const getPopoverPlacement = (index: number, total: number) => {
  if (total <= 1) return 'bottom-end'
  if (index === 0) return 'bottom-end'
  if (index === total - 1) return 'top-end'
  return 'bottom-end' // Default
}

const getDictZh = (definitions: BaseDictDefinition[]) => {
  return definitions
    .map((d) => {
      const meanings = d.meanings?.zh?.join('; ')
      return meanings ? { pos: d.pos, text: meanings } : null
    })
    .filter((item): item is { pos: string; text: string } => item !== null)
}

const getDictEn = (definitions: BaseDictDefinition[]) => {
  const lines: { pos: string; text: string }[] = []
  definitions.forEach((d) => {
    d.meanings?.en?.forEach((m) => {
      if (m) lines.push({ pos: d.pos, text: m })
    })
  })
  return lines
}

import { EXTERNAL_DICTS, ONLINE_DICTS } from '@/constants/dictionaries'

// External Dictionary Configuration
const showDictPopup = ref(false)
const currentDictName = ref('')
const currentDictUrl = ref('')
const currentDictMargin = ref('')

const visibleExternalDicts = computed(() => EXTERNAL_DICTS.filter((d) => d.show))

const onlineDictActions = computed(() => {
  return ONLINE_DICTS.filter((d) => d.show).map((d) => ({
    ...d,
    text: d.name,
    className: 'online-dict-action',
  }))
})

const hasVisibleOnlineDicts = computed(() => ONLINE_DICTS.some((d) => d.show))

const openExternalDict = (dict: { name: string; title?: string; url: string; margin?: string }) => {
  if (!currentWord.value) return
  currentDictName.value = dict.title || dict.name
  // Some dictionaries might have issues with non-standard URL characters
  const word = encodeURIComponent(currentWord.value.word.trim())
  currentDictUrl.value = dict.url.replace('{word}', word)
  currentDictMargin.value = dict.margin || ''
  showDictPopup.value = true
}

const revealAnswer = () => {
  showAnswer.value = true
}

const onReviewResult = async (status: 1 | 2) => {
  const current = cardList.value[currentIndex.value]
  if (current) {
    // 每次评价后，更新 lastReviewID
    await authStore.updateUserConfig({ lastReviewID: current.id })
    await wordsStore.submitReviewResult(current, status)

    // 如果是认识(2)且已达标(Mastered)，显示达标动画
    if (status === 2 && isMastered(current)) {
      showMasteredAnimation.value = true
      setTimeout(async () => {
        showMasteredAnimation.value = false
        await nextTick()
        swipeNextReview()
      }, 1000)
    } else if (status === 2) {
      // 认识：自动跳转下一个未复习的单词
      await nextTick()
      swipeNextReview()
    }
    // 不认识：状态更新会自动触发视图重绘，移除遮罩（因为 currentStatus 变为 1）
  }
}

const swipeNextReview = async () => {
  const list = cardList.value
  const len = list.length
  if (len === 0) return

  const start = currentIndex.value
  let foundIndex = -1

  // 从当前卡片向后循环搜索下一个 last_status === 0 的项
  // 如果循环回到自己(即起点)仍无待复习项，判定为复习完成
  for (let i = 1; i < len; i++) {
    const idx = (start + i) % len
    const word = list[idx]
    if (!word) continue
    const status = word.last_status || 0
    if (status === 0 && !isMastered(word)) {
      foundIndex = idx
      break
    }
  }

  if (foundIndex !== -1) {
    swipeRef.value?.swipeTo(foundIndex)
  } else {
    // 复习完成
    // 自动重置复习进度
    await wordsStore.resetReviewStatus()

    showDialog({
      title: '复习完成',
      message: '本轮复习已完成，进度已自动重置。',
    }).then(() => {
      router.back()
    })
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
  background-color: var(--van-background);
}
:deep(.van-nav-bar__title) {
  font-size: var(--van-font-size-lg);
}

/* 顶部导航栏增加空白 */
:deep(.van-nav-bar) {
  padding-top: var(--vnb-pad-top);
  box-sizing: content-box;
  background-color: var(--vnb-nav-background);
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
  margin: 0 -4px;
}

.nav-bar-icon.active {
  background-color: var(--van-nav-bar-icon-color);
  color: #fff;
}

.nav-bar-icon.disabled {
  color: var(--van-gray-4);
  cursor: not-allowed;
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
  overscroll-behavior-y: contain;
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
  background-color: var(--van-cell-background);
  padding: 8px 16px 6px 16px;
}
.card-content {
  padding: 4px 16px 30px 16px;
}
.word-row {
  margin-bottom: 2px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.word-text {
  font-weight: bold;
  font-size: calc(var(--van-font-size-xl) + 2px);
  color: var(--van-text-color);
  line-height: 1.2;
}
.word-text,
.phon-text,
.exp-cn,
.exp-en,
.sen-en,
.sen-ch,
.sen-memo,
.dict-text-zh,
.dict-text-en {
  user-select: text;
  -webkit-user-select: text;
}
.bookmark-icon {
  font-size: 22px;
  color: var(--van-gray-5);
  flex-shrink: 0;
  padding: 4px;
  margin-right: -4px;
}
.bookmark-icon.active {
  color: var(--van-primary-color);
}
.bookmark-icon.hidden {
  visibility: hidden;
  pointer-events: none;
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
.phon-icon.loading {
  animation: spin 1s linear infinite;
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
  top: 50%;
  bottom: auto;
  transform: translateY(-50%) scale(0.75);
  z-index: 60;
  display: inline-flex;
  padding: 0 10px;
  backdrop-filter: blur(6px);
  opacity: 0.3;
  transition: opacity 0.3s;
}
.nav-btn:hover {
  opacity: 1;
}
.nav-prev {
  left: 0;
}
.nav-next {
  right: 0;
}

.dict-tabs {
  margin-top: 16px;
  position: relative;
}
.dict-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: var(--van-font-size-sm);
  font-weight: bold;
  margin-bottom: 8px;
  color: var(--van-text-color);
  text-align: left;
  padding-right: 32px; /* Avoid overlap with the eye icon */
}
.ext-dict-link {
  font-weight: normal;
  color: var(--van-primary-color);
  cursor: pointer;
  font-size: var(--van-font-size-sm);
}
:global(.online-dict-action .van-popover__action-text) {
  color: var(--van-primary-color);
  font-size: var(--van-font-size-sm);
  font-weight: normal;
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
.dict-empty-content {
  font-size: var(--van-font-size-sm);
  color: var(--van-text-color-3);
  padding: 8px 0;
  text-align: center;
}
.dict-collapsed {
  margin-top: 16px;
  text-align: center;
  padding: 10px;
  background-color: var(--van-background-2);
  border-radius: 4px;
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

.review-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--van-background);
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  cursor: pointer;
  padding-top: 40px;
}
.mask-hint {
  color: var(--van-gray-5);
  font-size: var(--van-font-size-md);
  border: 1px dashed var(--van-gray-4);
  padding: 8px 16px;
  border-radius: 4px;
}
.review-hidden {
  opacity: 0;
  pointer-events: none;
}
.review-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--van-background);
  border-top: 1px solid var(--van-border-color);
  padding: 12px 16px;
  display: flex;
  gap: 24px;
  z-index: 50;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  justify-content: center;
  .review-btn {
    min-width: 120px;
    max-width: 140px;
    flex: 1;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-weight: bold;
    font-size: var(--van-font-size-md);
    cursor: pointer;
    transition: opacity 0.2s;
  }
}

.review-stats-overlay {
  position: fixed;
  bottom: calc(12px + 44px + 12px + env(safe-area-inset-bottom) + 12px);
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.8);
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  z-index: 100;
  pointer-events: none;
  width: max-content;
  backdrop-filter: blur(4px);
}

@media (prefers-color-scheme: dark) {
  .review-stats-overlay {
    background-color: rgba(30, 30, 30, 0.8);
  }
}

.stat-item {
  display: flex;
  align-items: center;
  font-size: var(--van-font-size-sm);
  color: var(--van-text-color);
}

.stat-item .van-icon {
  margin-right: 4px;
}

.stat-item.unknown {
  color: var(--van-danger-color);
}
.stat-item.known {
  color: var(--van-success-color);
}
.stat-item.streak {
  color: var(--van-primary-color);
}

.stat-label {
  margin-right: 4px;
  opacity: 0.8;
  font-size: var(--van-font-size-xs);
}
.stat-value {
  font-weight: bold;
}
.review-btn:active {
  opacity: 0.8;
}
.review-btn.reveal {
  background: var(--van-gray-2);
  color: var(--van-text-color);
}
.review-btn.unknown {
  background: var(--van-danger-color);
  color: #fff;
}
.review-btn.known {
  background: var(--van-success-color);
  color: #fff;
}
.review-btn.next {
  background: var(--van-primary-color);
  color: #fff;
}
.review-btn.disabled {
  background: var(--van-gray-3);
  cursor: not-allowed;
  pointer-events: none;
}
.review-btn.unknown.disabled {
  color: var(--van-danger-color);
}
.review-btn.known.disabled {
  color: var(--van-success-color);
}
.review-btn.mastered.disabled {
  color: var(--van-orange);
}
.card-content.review-padding {
  padding-bottom: 80px;
}
.btn-icon {
  margin-right: 4px;
  font-size: var(--van-font-size-md);
}
.btn-icon-left {
  margin-right: 4px;
  font-weight: bold;
}
.btn-icon-right {
  margin-left: 4px;
  font-size: var(--van-font-size-md);
  font-weight: bold;
}

.mastered-animation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.mastered-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.mastered-icon {
  font-size: 80px;
  color: var(--van-warning-color);
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
}

.mastered-text {
  font-size: 24px;
  color: #fff;
  font-weight: bold;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.mastered-word {
  font-size: 32px;
  color: var(--van-warning-color);
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

@keyframes bounceIn {
  from,
  20%,
  40%,
  60%,
  80%,
  to {
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  0% {
    opacity: 0;
    transform: scale3d(0.3, 0.3, 0.3);
  }

  20% {
    transform: scale3d(1.1, 1.1, 1.1);
  }

  40% {
    transform: scale3d(0.9, 0.9, 0.9);
  }

  60% {
    opacity: 1;
    transform: scale3d(1.03, 1.03, 1.03);
  }

  80% {
    transform: scale3d(0.97, 0.97, 0.97);
  }

  to {
    opacity: 1;
    transform: scale3d(1, 1, 1);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
