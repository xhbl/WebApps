<template>
  <div class="words-manage-view" @click="closeAllPopovers">
    <van-nav-bar :title="pageTitle" fixed placeholder>
      <template #left>
        <van-icon name="arrow-left" class="nav-bar-icon" @click="onClickLeft" />
      </template>
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <div v-if="wordsStore.words.length > 0">
            <van-index-bar
              v-if="wordsStore.sortMode === 'alpha'"
              :index-list="indexList"
              :sticky-offset-top="46"
            >
              <van-checkbox-group v-model="checkedIds">
                <div v-for="group in wordsStore.groupedWords" :key="group.key">
                  <van-index-anchor :index="group.key" />
                  <van-cell
                    v-for="w in group.words"
                    :key="w.id"
                    :label="getWordDefinition(w)"
                    is-link
                    @click="onWordItemClick(w)"
                  >
                    <template #icon>
                      <div v-if="mode === 'audio'" class="icon-wrapper" @click.stop="playAudio(w)">
                        <van-icon name="volume-o" class="list-leading-icon" />
                      </div>
                      <div v-if="mode === 'edit'" class="icon-wrapper" @click.stop>
                        <van-popover
                          v-model:show="showWordPopover[w.id]"
                          :actions="wordActions"
                          :placement="getWordPopoverPlacement(w)"
                          @select="(action) => onWordAction(action, w)"
                          @open="onPopoverOpen(w.id)"
                        >
                          <template #reference>
                            <van-icon name="edit" class="list-leading-icon" />
                          </template>
                        </van-popover>
                      </div>
                      <div v-if="mode === 'select'" class="icon-wrapper" @click.stop>
                        <van-checkbox :name="w.id" />
                      </div>
                    </template>
                    <template #title>
                      <span class="word-text">{{ w.word }}</span>
                      <span v-if="w.phon" class="word-phon">/{{ w.phon }}/</span>
                    </template>
                  </van-cell>
                </div>
              </van-checkbox-group>
            </van-index-bar>
            <van-checkbox-group v-else v-model="checkedIds">
              <van-cell
                v-for="w in wordsStore.words"
                :key="w.id"
                :label="getWordDefinition(w)"
                is-link
                @click="onWordItemClick(w)"
              >
                <template #icon>
                  <div v-if="mode === 'audio'" class="icon-wrapper" @click.stop="playAudio(w)">
                    <van-icon name="volume-o" class="list-leading-icon" />
                  </div>
                  <div v-if="mode === 'edit'" class="icon-wrapper" @click.stop>
                    <van-popover
                      v-model:show="showWordPopover[w.id]"
                      :actions="wordActions"
                      :placement="getWordPopoverPlacement(w)"
                      @select="(action) => onWordAction(action, w)"
                      @open="onPopoverOpen(w.id)"
                    >
                      <template #reference>
                        <van-icon name="edit" class="list-leading-icon" />
                      </template>
                    </van-popover>
                  </div>
                  <div v-if="mode === 'select'" class="icon-wrapper" @click.stop>
                    <van-checkbox :name="w.id" />
                  </div>
                </template>
                <template #title>
                  <span class="word-text">{{ w.word }}</span>
                  <span v-if="w.phon" class="word-phon">/{{ w.phon }}/</span>
                </template>
              </van-cell>
            </van-checkbox-group>
          </div>
          <van-empty v-else description="暂无单词，点击下方➕新建" />
        </div>
      </van-pull-refresh>
    </div>

    <div class="bottom-bar van-hairline--top">
      <template v-if="mode === 'select'">
        <div class="bottom-bar-left select-mode-left">
          <div class="select-all-container" @click="toggleSelectAll">
            <van-checkbox
              :model-value="isAllSelected"
              :indeterminate="isIndeterminate"
              @click.stop="toggleSelectAll"
            />
            <span class="select-all-text">全选</span>
          </div>
          <van-icon
            name="bookmark-o"
            class="bottom-bar-icon"
            :class="{ disabled: checkedIds.length === 0 }"
            @click="onBatchBookmark"
          />
          <van-icon
            name="delete-o"
            class="bottom-bar-icon"
            :class="{ disabled: checkedIds.length === 0, 'danger-icon': checkedIds.length > 0 }"
            @click="onBatchDelete"
          />
        </div>
        <div class="bottom-bar-right">
          <van-icon name="close" class="bottom-bar-icon" @click="toggleMode('select')" />
        </div>
      </template>
      <template v-else>
        <div class="bottom-bar-left">
          <van-icon
            name="volume-o"
            class="bottom-bar-icon"
            :class="{ active: mode === 'audio' }"
            @click="toggleMode('audio')"
          />
          <van-icon
            name="edit"
            class="bottom-bar-icon"
            :class="{ active: mode === 'edit' }"
            @click="toggleMode('edit')"
          />
        </div>
        <div class="bottom-bar-center">
          <van-icon name="plus" class="bottom-bar-icon large-icon" @click="openAddWord" />
        </div>
        <div class="bottom-bar-right">
          <van-icon
            name="passed"
            class="bottom-bar-icon"
            :class="{ active: isSelectMode }"
            @click="toggleMode('select')"
          />
          <van-icon
            name="sort"
            class="bottom-bar-icon"
            :class="{ active: wordsStore.sortMode === 'alpha' }"
            @click="wordsStore.toggleSortMode"
          />
        </div>
      </template>
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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useWordsStore, type WordsStore } from '@/stores/words'
import { useAppMenu } from '@/composables/useAppMenu'
import WordNewDialog from '@/components/WordNewDialog.vue'
import type { Word } from '@/types'
import { toast } from '@/utils/toast'
import * as wordsApi from '@/api/words'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()
const wordsStore: WordsStore = useWordsStore()

const bid = Number(route.params.bid)
const showWordNew = ref(false)
const refreshing = ref(false)
const loading = ref(true)
const showDeleteDialog = ref(false)
const deleteDialogTitle = ref('')
const deleteDialogMessage = ref('')
type ViewMode = 'none' | 'edit' | 'audio' | 'select'
const savedMode = authStore.userInfo?.cfg?.wordsListMode
const mode = ref<ViewMode>(savedMode === 'edit' || savedMode === 'audio' ? savedMode : 'none')
const previousMode = ref<ViewMode>('none')
const checkedIds = ref<number[]>([])
let pendingDeleteWord: Word | null = null

const showWordPopover = ref<Record<number, boolean>>({})
const wordActions = [
  { text: '编辑', icon: 'edit', key: 'edit' },
  { text: '加入复习', icon: 'bookmark-o', key: 'review' },
]

const onPopoverOpen = (id: number) => {
  for (const key in showWordPopover.value) {
    const k = Number(key)
    if (k !== id) {
      showWordPopover.value[k] = false
    }
  }
}

const closeAllPopovers = () => {
  for (const key in showWordPopover.value) {
    showWordPopover.value[Number(key)] = false
  }
}

const getWordPopoverPlacement = (w: Word) => {
  const index = wordsStore.words.indexOf(w)
  if (wordsStore.words.length > 5 && index >= wordsStore.words.length - 2) {
    return 'top-start'
  }
  return 'bottom-start'
}

const onWordAction = async (action: { key: string }, w: Word) => {
  showWordPopover.value[w.id] = false
  if (action.key === 'edit') {
    openWordCard(w)
  } else if (action.key === 'review') {
    try {
      const res = await wordsApi.saveWord({ ...w, book_id: -1, _new: 1 })
      if (res.data.success) {
        toast.showSuccess('已加入复习本')
      } else {
        toast.showFail('加入失败')
      }
    } catch {
      toast.showFail('操作失败')
    }
  }
}

const pageTitle = computed(() => {
  if (bid === 0) return '全部单词'
  if (bid === -1) return '复习本'
  // 优先从 books 列表中查找，确保获取到编辑后的最新标题
  const b = booksStore.books.find((b) => b.id === bid)
  if (b) return b.title

  return booksStore.currentBook?.id === bid ? booksStore.currentBook.title : '单词列表'
})

const indexList = computed(() =>
  wordsStore.sortMode === 'alpha' ? wordsStore.groupedWords.map((g) => g.key) : [],
)

const isSelectMode = computed(() => mode.value === 'select')

onMounted(async () => {
  loading.value = true
  if (booksStore.books.length === 0) {
    await booksStore.loadBooks()
  }
  if (bid > 0) {
    const b = booksStore.books.find((b) => b.id === bid)
    if (b) booksStore.setCurrentBook(b)
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

const toggleMode = (target: Exclude<ViewMode, 'none'>) => {
  if (target === 'select') {
    if (mode.value === 'select') {
      mode.value = previousMode.value
    } else {
      previousMode.value = mode.value
      mode.value = 'select'
      checkedIds.value = []
    }
    return
  }

  if (mode.value === target) {
    mode.value = 'none'
  } else {
    mode.value = target
  }

  const modeToSave = mode.value === 'edit' || mode.value === 'audio' ? mode.value : 'none'
  authStore.updateUserConfig({ wordsListMode: modeToSave })
}

const isAllSelected = computed(() => {
  return wordsStore.words.length > 0 && checkedIds.value.length === wordsStore.words.length
})

const isIndeterminate = computed(() => {
  return checkedIds.value.length > 0 && checkedIds.value.length < wordsStore.words.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    checkedIds.value = []
  } else {
    checkedIds.value = wordsStore.words.map((w) => w.id)
  }
}

const onBatchDelete = () => {
  if (checkedIds.value.length === 0) return
  deleteDialogTitle.value = '批量删除'
  deleteDialogMessage.value = `确定要删除选中的 ${checkedIds.value.length} 个单词吗？`
  showDeleteDialog.value = true
}

const onBatchBookmark = () => {
  if (checkedIds.value.length === 0) return
  // TODO: Implement add to review book
}

const onWordItemClick = (w: Word) => {
  if (mode.value === 'select') {
    const idx = checkedIds.value.indexOf(w.id)
    if (idx === -1) checkedIds.value.push(w.id)
    else checkedIds.value.splice(idx, 1)
  } else {
    openWordCard(w)
  }
}

const getWordDefinition = (w: Word) => {
  if (!w.explanations || w.explanations.length === 0) return ''
  return w.explanations
    .map((e) => {
      const zh = e.exp?.zh || ''
      return `${e.pos} ${zh}`
    })
    .join('; ')
}

const onConfirmDeleteWord = async () => {
  if (mode.value === 'select' && checkedIds.value.length > 0) {
    for (const id of checkedIds.value) {
      const w = wordsStore.words.find((word) => word.id === id)
      if (w) await wordsStore.deleteWord(w)
    }
    checkedIds.value = []
    showDeleteDialog.value = false
  } else if (pendingDeleteWord) {
    await wordsStore.deleteWord(pendingDeleteWord)
    showDeleteDialog.value = false
    pendingDeleteWord = null
  }
  await wordsStore.loadWords(bid)
}

const openWordCard = (w: Word) => {
  wordsStore.setCurrentWord(w)
  router.push(`/books/${bid}/words/${w.id}`)
}

const playAudio = (w: Word) => {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(w.word)
    msg.lang = 'en-US' // 设置为美式英语

    // 优先选择美式英语语音
    const voices = window.speechSynthesis.getVoices()
    const usVoice = voices.find((voice) => voice.lang === 'en-US')
    if (usVoice) {
      msg.voice = usVoice
    }

    window.speechSynthesis.speak(msg)
  }
}

const { openMenu, AppMenu } = useAppMenu({
  showUser: false,
  showLogout: false,
  get items() {
    if (mode.value === 'select') {
      const actions = []
      if (checkedIds.value.length > 0) {
        actions.push({
          name: '删除',
          icon: 'delete-o',
          handler: onBatchDelete,
          color: 'var(--van-danger-color)',
        })
        actions.push({
          name: '加入复习本',
          icon: 'bookmark-o',
          handler: onBatchBookmark,
        })
      }
      actions.push({ name: '退出批量管理', icon: 'close', handler: () => toggleMode('select') })
      return actions
    }
    return [
      { name: '添加单词', icon: 'plus', handler: openAddWord },
      {
        // 循环切换：默认 -> 语音 -> 编辑 -> 默认
        name:
          mode.value === 'edit'
            ? '关闭编辑栏'
            : mode.value === 'audio'
              ? '显示编辑栏'
              : '显示语音栏',
        icon: mode.value === 'none' ? 'volume-o' : 'edit',
        handler: () => {
          if (mode.value === 'edit')
            toggleMode('edit') // 关闭
          else if (mode.value === 'audio')
            toggleMode('edit') // 切换到编辑
          else toggleMode('audio') // 切换到语音
        },
      },
      {
        name: '批量管理',
        icon: 'passed',
        handler: () => toggleMode('select'),
      },
      {
        name: wordsStore.sortMode === 'alpha' ? '关闭字母排序' : '按字母排序',
        icon: 'sort',
        handler: () => wordsStore.toggleSortMode(),
      },
    ]
  },
})
</script>

<style scoped>
.words-manage-view {
  min-height: 100vh;
  background-color: var(--van-background);
}

.content {
  padding-top: 0px;
  padding-bottom: var(--van-nav-bar-height);
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

.nav-bar-icon {
  font-size: 22px;
}

/* 调整标题字号 */
:deep(.van-nav-bar__title) {
  font-size: var(--van-font-size-xl);
}

/* 调整列表字号 */
:deep(.van-cell__title) {
  font-size: var(--van-font-size-lg);
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
:deep(.van-cell__label) {
  font-size: var(--van-font-size-md);
  color: var(--van-gray-7);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.word-text {
  font-weight: bold;
}

.word-phon {
  margin-left: 1em;
  font-size: var(--van-font-size-md);
  color: var(--van-gray-6);
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

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--van-nav-bar-height);
  background: var(--van-nav-bar-background);
  display: flex;
  align-items: center;
  z-index: 100;
  padding: 0 16px;
}

.bottom-bar-left {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  gap: 24px;
}

.bottom-bar-center {
  display: flex;
  justify-content: center;
  width: 40px;
}

.bottom-bar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 24px;
}

.bottom-bar-icon {
  font-size: 22px;
  color: var(--van-nav-bar-icon-color);
  padding: 4px;
  border-radius: 4px;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.bottom-bar-icon.large-icon {
  font-size: 32px;
}

.bottom-bar-icon:not(.active):active {
  /* Replicate the press effect from van-nav-bar */
  background-color: var(--van-active-color);
}

.bottom-bar-icon.active {
  background-color: var(--van-nav-bar-icon-color);
  color: #fff;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 40px; /* 扩大点击宽度 */
  height: 44px; /* 扩大点击高度 */
  margin-left: -16px; /* 向左延伸至边缘 */
  padding-left: 10px; /* 修正图标视觉位置 */
  margin-right: 0;
  cursor: pointer;
}

.list-leading-icon {
  font-size: 22px;
  color: var(--van-nav-bar-icon-color);
  display: flex;
  align-items: center;
  height: 100%;
}

.select-all-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.select-all-text {
  font-size: 14px;
  color: var(--van-text-color);
  white-space: nowrap;
}

.bottom-bar-icon.disabled {
  color: var(--van-gray-5);
  pointer-events: none;
}

.bottom-bar-icon.danger-icon {
  color: var(--van-danger-color);
}

/* 修复索引栏吸顶时覆盖导航栏的问题 */
:deep(.van-nav-bar--fixed) {
  z-index: 101;
}

/* 调整索引栏样式 */
:deep(.van-index-anchor) {
  color: var(--van-gray-6);
  line-height: 24px;
}

:deep(.van-index-bar__sidebar) {
  color: var(--van-gray-6);
}
</style>
