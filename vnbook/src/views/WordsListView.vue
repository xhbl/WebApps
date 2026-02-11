<template>
  <div class="words-manage-view" @click="closeAllPopovers">
    <!-- 顶部区域：搜索栏 或 导航栏 -->
    <div class="top-bar-container">
      <van-search
        v-if="isSearchActive"
        ref="searchRef"
        v-model="searchText"
        show-action
        placeholder="搜索单词"
        shape="round"
        class="fixed-search"
        @update:model-value="onSearchUpdate"
        @cancel="exitSearchMode"
        @search="onSearchConfirm"
      />
      <van-nav-bar v-else :title="pageTitle" fixed :placeholder="false" z-index="100">
        <template #left>
          <van-icon name="arrow-left" class="nav-bar-icon" @click="onClickLeft" />
        </template>
        <template #right>
          <van-icon
            name="search"
            class="nav-bar-icon"
            style="margin-right: 12px"
            @click="enterSearchMode"
          />
          <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
        </template>
      </van-nav-bar>
    </div>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <div v-if="wordsStore.filteredWords.length > 0">
            <van-index-bar
              v-if="wordsStore.sortMode === 'alpha'"
              :index-list="indexList"
              :sticky-offset-top="stickyOffsetTop"
            >
              <van-checkbox-group v-model="checkedIds">
                <div v-for="group in wordsStore.groupedWords" :key="group.key">
                  <van-index-anchor :index="group.key" />
                  <word-list-item
                    v-for="w in group.words"
                    :key="w.id"
                    :word="w"
                    :mode="effectiveMode"
                    :show-popover="showWordPopover[w.id] ?? false"
                    :popover-placement="getWordPopoverPlacement(w)"
                    :highlight="wordsStore.searchKeyword"
                    :delete-text="deleteActionText"
                    :allow-move="allowMove"
                    :move-text="moveActionConfig.text"
                    :move-icon="moveActionConfig.icon"
                    :is-review-mode="isReviewMode"
                    @update:show-popover="(val) => (showWordPopover[w.id] = val)"
                    @open-popover="onPopoverOpen(w.id)"
                    @action="onWordAction"
                    @click="onWordItemClick"
                  />
                </div>
              </van-checkbox-group>
            </van-index-bar>
            <van-checkbox-group v-else v-model="checkedIds">
              <word-list-item
                v-for="w in wordsStore.filteredWords"
                :key="w.id"
                :word="w"
                :mode="effectiveMode"
                :show-popover="showWordPopover[w.id] ?? false"
                :popover-placement="getWordPopoverPlacement(w)"
                :highlight="wordsStore.searchKeyword"
                :delete-text="deleteActionText"
                :allow-move="allowMove"
                :move-text="moveActionConfig.text"
                :move-icon="moveActionConfig.icon"
                :is-review-mode="isReviewMode"
                @update:show-popover="(val) => (showWordPopover[w.id] = val)"
                @open-popover="onPopoverOpen(w.id)"
                @action="onWordAction"
                @click="onWordItemClick"
              />
            </van-checkbox-group>
          </div>
          <van-empty
            v-else
            :description="
              wordsStore.searchKeyword
                ? '未找到相关单词'
                : wordsStore.orphanFilter
                  ? '暂无未入本单词'
                  : bid <= 0
                    ? '暂无单词'
                    : '暂无单词，点击下方➕新建'
            "
          />
        </div>
      </van-pull-refresh>
    </div>

    <div class="bottom-bar van-hairline--top">
      <template v-if="isSelectMode">
        <div class="bottom-bar-left select-mode-left">
          <div class="select-all-container" @click="toggleSelectAll">
            <van-checkbox
              :model-value="isAllSelected"
              :indeterminate="isIndeterminate"
              @click.stop="toggleSelectAll"
            />
            <span class="select-all-text">全选</span>
          </div>
          <template v-if="isReviewMode">
            <van-icon
              name="bookmark-o"
              class="bottom-bar-icon warning-icon"
              :class="{ disabled: checkedIds.length === 0 }"
              @click="onBatchCancelReview"
            />
          </template>
          <template v-else>
            <van-icon
              name="bookmark-o"
              class="bottom-bar-icon"
              :class="{ disabled: checkedIds.length === 0 }"
              @click="onBatchBookmark"
            />
            <van-icon
              v-if="allowMove"
              :name="moveActionConfig.icon"
              class="bottom-bar-icon"
              :class="{ disabled: checkedIds.length === 0 }"
              @click="onBatchMove"
            />
          </template>
          <van-icon
            name="delete-o"
            class="bottom-bar-icon"
            v-if="!isReviewMode"
            :class="{
              disabled: checkedIds.length === 0,
              'danger-icon': checkedIds.length > 0,
            }"
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
          <van-icon
            v-if="isReviewMode"
            name="info-o"
            class="bottom-bar-icon large-icon"
            @click="showReviewInfo"
          />
          <van-icon
            v-else-if="bid > 0"
            name="plus"
            class="bottom-bar-icon large-icon"
            @click="openAddWord"
          />
          <div
            v-else-if="bid === 0"
            class="orphan-toggle-btn"
            :class="{ active: wordsStore.orphanFilter }"
            @click="toggleOrphanFilter"
          >
            <van-icon name="failure" />
          </div>
        </div>
        <div class="bottom-bar-right">
          <van-icon
            name="passed"
            class="bottom-bar-icon"
            :class="{ active: isSelectMode }"
            @click="toggleMode('select')"
          />
          <div class="sort-wrapper" @click.stop>
            <van-popover
              v-model:show="showWordPopover['sort']"
              :actions="sortActions"
              placement="top-end"
              @select="onSortSelect"
              @open="onPopoverOpen('sort')"
            >
              <template #reference>
                <van-icon name="sort" class="bottom-bar-icon" />
              </template>
            </van-popover>
          </div>
        </div>
      </template>
    </div>

    <AppMenu />
    <word-editor-dialog
      v-model="showWordEditor"
      :bid="bid"
      :word="editingWord"
      @update:word="editingWord = $event"
    />
    <review-guide-dialog v-model="showReviewGuide" />

    <van-dialog
      v-model:show="showBelongingBooks"
      title="所属单词本"
      :show-confirm-button="false"
      close-on-click-overlay
      :close-on-popstate="false"
    >
      <div class="belonging-books-content">
        <div v-if="belongingBooksList.length === 0 && !wordInReview" class="empty-text">
          无所属单词本（未入本）
        </div>
        <van-cell-group v-else>
          <van-cell
            v-for="book in belongingBooksList"
            :key="book.id"
            :title="book.title"
            icon="label-o"
            class="book-item"
          />
          <van-cell v-if="wordInReview" title="已加入复习本" icon="bookmark" class="book-item" />
        </van-cell-group>
      </div>
    </van-dialog>

    <van-action-sheet
      v-model:show="showMoveSheet"
      :actions="moveTargetOptions"
      description="请选择目标单词本"
      cancel-text="取消"
      @select="onMoveConfirm"
      :close-on-popstate="false"
    />
  </div>
</template>

<script lang="ts">
export default {
  name: 'WordsList',
}
</script>

<script setup lang="ts">
import { computed, ref, onActivated, nextTick, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useWordsStore, type WordsStore } from '@/stores/words'
import { useAppMenu } from '@/composables/useAppMenu'
import { usePopoverMap } from '@/composables/usePopoverMap'
import WordEditorDialog from '@/components/WordEditorDialog.vue'
import WordListItem from '@/components/WordListItem.vue'
import ReviewGuideDialog from '@/components/ReviewGuideDialog.vue'
import type { Word, SortMode, Book } from '@/types'
import type { SearchInstance, PopoverAction } from 'vant'
import { usePopupHistory } from '@/composables/usePopupHistory'
import { showGlobalDialog } from '@/composables/useGlobalDialog'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()
const wordsStore: WordsStore = useWordsStore()

const bid = computed(() => Number(route.params.bid))
const isReviewMode = computed(() => bid.value === -1)
const showWordEditor = ref(false)
const showReviewGuide = ref(false)
const editingWord = ref<Word | null>(null)
const refreshing = ref(false)
const loading = ref(true)
type ListMode = 'none' | 'edit' | 'audio'
const savedMode = authStore.userInfo?.cfg?.wordsListMode
const defaultMode = savedMode === 'edit' || savedMode === 'audio' ? savedMode : 'none'
const mode = ref<ListMode>(defaultMode)
const isSelectMode = ref(route.query.select === 'true')
const checkedIds = ref<number[]>([])

const scrollTop = ref(0)
const currentBid = ref<number | null>(null)
const searchText = ref('')
const isSearchActive = ref(false)
const searchRef = ref<SearchInstance | null>(null)

const stickyOffsetTop = ref(56)

onMounted(() => {
  // 动态读取 CSS 变量并计算数值，既保持了配置的统一性，又满足了组件的类型要求
  const rootStyle = getComputedStyle(document.documentElement)
  const navHeight = parseInt(rootStyle.getPropertyValue('--van-nav-bar-height'), 10) || 46
  const padTop = parseInt(rootStyle.getPropertyValue('--vnb-pad-top'), 10) || 0
  stickyOffsetTop.value = navHeight + padTop
})

onBeforeRouteLeave((to, from, next) => {
  scrollTop.value = window.scrollY
  next()
})

const {
  popoverMap: showWordPopover,
  onOpen: onPopoverOpen,
  closeAll: closeAllPopovers,
} = usePopoverMap()

const getWordPopoverPlacement = (w: Word) => {
  const index = wordsStore.words.indexOf(w)
  if (wordsStore.words.length > 5 && index >= wordsStore.words.length - 2) {
    return 'top-start'
  }
  return 'bottom-start'
}

const effectiveMode = computed(() => (isSelectMode.value ? 'select' : mode.value))

const deleteActionText = computed(() => '删除')

// 允许移动的条件：不是“全部单词”视图 (bid != 0)，或者是“未入本单词”视图 (orphanFilter = true)
const allowMove = computed(() => bid.value !== 0 || wordsStore.orphanFilter)

const moveActionConfig = computed(() => {
  if (bid.value === 0) {
    return { text: '添加到...', icon: 'label-o' }
  }
  return { text: '移动到...', icon: 'exchange' }
})

// --- 排序逻辑 ---
const sortActions = computed(() => {
  const actions: PopoverAction[] = []
  if (isReviewMode.value) {
    actions.push({ text: '复习进度 (连胜升序)', value: 'streak' })
    actions.push({ text: '最新加入 (时间倒序)', value: 'date' })
    actions.push({ text: '字母表顺序', value: 'alpha' })
  } else {
    actions.push({ text: '最新加入 (时间倒序)', value: 'date' })
    actions.push({ text: '字母表顺序', value: 'alpha' })
  }
  // 标记当前选中项
  return actions.map((a) => ({
    ...a,
    color: wordsStore.sortMode === a.value ? 'var(--van-primary-color)' : undefined,
  }))
})

const onSortSelect = (action: PopoverAction) => {
  if (action.value) {
    wordsStore.setSortMode(action.value as SortMode)
  }
}

const showBelongingBooks = ref(false)
const belongingBooksList = ref<Book[]>([])
const wordInReview = ref(false)
usePopupHistory(showBelongingBooks)

const onWordAction = async (action: { key: string }, w: Word) => {
  showWordPopover.value[w.id] = false
  if (action.key === 'edit') {
    wordsStore.setCurrentWord(w)
    router.push({
      path: `/books/${bid.value}/words/${w.id}`,
      query: { single: 'true', edit: 'true' },
    })
  } else if (action.key === 'review') {
    await handleAddToReview([w])
  } else if (action.key === 'books') {
    const result = await wordsStore.getBelongingBooks(w.id)
    if (result) {
      belongingBooksList.value = result.books
      wordInReview.value = result.inReview
      showBelongingBooks.value = true
    } else {
      import('@/utils/toast').then(({ toast }) => toast.showFail('获取失败'))
    }
  } else if (action.key === 'remove-review') {
    await handleRemoveFromReview([w])
  } else if (action.key === 'move') {
    handleMove([w])
  } else if (action.key === 'delete') {
    await handleDelete([w])
  }
}

const pageTitle = computed(() => {
  if (bid.value === 0) {
    return wordsStore.orphanFilter ? '未入本单词' : '全部单词'
  }
  if (bid.value === -1) return '复习本'
  // 优先从 books 列表中查找，确保获取到编辑后的最新标题
  const b = booksStore.books.find((b) => b.id === bid.value)
  if (b) return b.title

  return booksStore.currentBook?.id === bid.value ? booksStore.currentBook.title : '单词列表'
})

const indexList = computed(() =>
  wordsStore.sortMode === 'alpha' ? wordsStore.groupedWords.map((g) => g.key) : [],
)

onActivated(async () => {
  if (!authStore.isLoggedIn) return
  const newBid = bid.value

  if (currentBid.value !== newBid) {
    currentBid.value = newBid

    // Initialize select mode based on URL (handles refresh with query param)
    isSelectMode.value = route.query.select === 'true'
    // 切换单词本时重置搜索状态
    isSearchActive.value = false
    checkedIds.value = []

    loading.value = true
    wordsStore.clearWords()
    window.scrollTo(0, 0)

    // Sync orphan filter from URL (must be after clearWords)
    if (newBid === 0) {
      wordsStore.orphanFilter = route.query.orphan === 'true'
    } else {
      wordsStore.orphanFilter = false
    }

    if (booksStore.books.length === 0) {
      await booksStore.loadBooks()
    }
    if (newBid > 0) {
      const b = booksStore.books.find((b) => b.id === newBid)
      if (b) booksStore.setCurrentBook(b)
    } else {
      booksStore.setCurrentBook(null)
    }
    await wordsStore.loadWords(newBid)
    loading.value = false
  } else {
    // Sync orphan filter from URL
    if (newBid === 0) {
      wordsStore.orphanFilter = route.query.orphan === 'true'
    } else {
      wordsStore.orphanFilter = false
    }

    // Sync select mode with URL
    const qSelect = route.query.select === 'true'
    if (isSelectMode.value !== qSelect) {
      isSelectMode.value = qSelect
      if (qSelect) checkedIds.value = []
    }

    if (scrollTop.value > 0) window.scrollTo(0, scrollTop.value)
    await wordsStore.loadWords(newBid)
    loading.value = false
  }
})

const onRefresh = async () => {
  refreshing.value = true
  await wordsStore.loadWords(bid.value)
  refreshing.value = false
}

const onClickLeft = () => {
  router.back()
}

const openAddWord = () => {
  editingWord.value = null
  showWordEditor.value = true
}

const showReviewInfo = () => {
  showReviewGuide.value = true
}

const enterSearchMode = () => {
  isSearchActive.value = true
  // 保持原有搜索词，方便用户继续搜索，如果需要清空可在此处处理
  window.scrollTo(0, 0)
  nextTick(() => searchRef.value?.focus())
}

const exitSearchMode = () => {
  isSearchActive.value = false
  searchText.value = ''
  wordsStore.setSearchKeyword('')
}

const toggleOrphanFilter = () => {
  const newValue = !wordsStore.orphanFilter
  wordsStore.orphanFilter = newValue

  // 使用 nextTick 推迟 URL 更新，优先保证列表渲染性能，避免路由操作阻塞 UI 响应
  nextTick(() => {
    const query = { ...route.query }
    if (newValue) {
      query.orphan = 'true'
    } else {
      delete query.orphan
    }
    router.replace({ query })
  })
}

const onSearchUpdate = (val: string) => wordsStore.setSearchKeyword(val)

const onSearchConfirm = () => searchRef.value?.blur()

const toggleMode = (target: 'edit' | 'audio' | 'select') => {
  if (target === 'select') {
    if (isSelectMode.value) {
      isSelectMode.value = false
      const query = { ...route.query }
      delete query.select
      router.replace({ query })
    } else {
      isSelectMode.value = true
      checkedIds.value = []
      const query = { ...route.query, select: 'true' }
      router.replace({ query })
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
  const visibleWords = wordsStore.filteredWords
  return visibleWords.length > 0 && visibleWords.every((w) => checkedIds.value.includes(w.id))
})

const isIndeterminate = computed(() => {
  const visibleWords = wordsStore.filteredWords
  if (visibleWords.length === 0) return false
  const checkedCount = visibleWords.filter((w) => checkedIds.value.includes(w.id)).length
  return checkedCount > 0 && checkedCount < visibleWords.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    checkedIds.value = []
  } else {
    checkedIds.value = wordsStore.filteredWords.map((w) => w.id)
  }
}

// --- 移动功能逻辑 ---
const showMoveSheet = ref(false)
const pendingMoveWords = ref<Word[]>([])
const { close: closeMoveSheet } = usePopupHistory(showMoveSheet)

const moveTargetOptions = computed(() => {
  // 过滤掉当前单词本
  return booksStore.books
    .filter((b) => b.id !== bid.value)
    .map((b) => ({
      name: `${b.title} (${b.nums}词)`,
      value: b.id,
    }))
})

const handleMove = (targets: Word[]) => {
  if (targets.length === 0) return
  if (moveTargetOptions.value.length === 0) {
    showGlobalDialog({ message: '没有可以移动的目标单词本', showCancelButton: false })
    return
  }
  pendingMoveWords.value = targets
  showMoveSheet.value = true
}

const onBatchMove = () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  handleMove(targets)
}

const onMoveConfirm = async (action: { name: string; value: number }) => {
  // 安全关闭并等待
  await closeMoveSheet()

  const targetBookId = action.value
  const targets = pendingMoveWords.value
  const isBatch = targets.length > 1
  const isAdd = bid.value === 0
  const actionText = isAdd ? '添加' : '移动'

  try {
    await showGlobalDialog({
      title: `确认${actionText}`,
      message: `确定将 ${isBatch ? `所选 ${targets.length} 个单词` : `单词"${targets[0]?.word}"`} ${actionText}到 "${action.name}" 吗？`,
      confirmButtonText: actionText,
      confirmButtonColor: 'var(--van-primary-color)',
      showCancelButton: true,
    })

    await wordsStore.moveWords(targets, targetBookId, bid.value, `${actionText}成功`)
    if (isSelectMode.value) checkedIds.value = []
  } catch {}
}

const handleRemoveFromReview = async (targets: Word[]) => {
  if (targets.length === 0) return
  try {
    await showGlobalDialog({
      title: '取消复习',
      message: `确定将 ${targets.length > 1 ? `所选 ${targets.length} 个单词` : `单词"${targets[0]?.word}"`} 移出复习本吗？`,
      confirmButtonText: '移出',
      confirmButtonColor: 'var(--van-warning-color)',
      showCancelButton: true,
    })
    // 复习本 ID 为 -1
    await wordsStore.deleteWords(targets, -1)
    if (isSelectMode.value) checkedIds.value = []
  } catch {}
}

const handleDelete = async (targets: Word[]) => {
  if (targets.length === 0) return

  const isAllWords = bid.value === 0
  const isBatch = targets.length > 1
  const actionText = '删除'
  const confirmButtonColor = 'var(--van-danger-color)'

  try {
    if (isAllWords) {
      // 全部单词模式：物理删除
      // 检查是否有单词被其他单词本收录
      const linkedWordsCount = targets.filter((w) => (w.book_count || 0) > 0).length

      if (linkedWordsCount > 0) {
        // 第一步确认：提示关联信息
        const msg = isBatch
          ? `所选单词中有 ${linkedWordsCount} 个已被单词本收录，确认要删除吗？`
          : `此单词已在 ${targets[0]?.book_count} 个单词本中收录，确认要删除吗？`

        await showGlobalDialog({
          title: '确认删除',
          message: msg,
          confirmButtonText: '下一步',
          confirmButtonColor: 'var(--van-danger-color)',
          showCancelButton: true,
        })
      }

      // 第二步（或直接）确认：永久删除提示
      const msg = isBatch
        ? `删除后将无法恢复，确认删除所选 ${targets.length} 个单词吗？`
        : `删除后将无法恢复，确认删除单词"${targets[0]?.word}"吗？`

      await showGlobalDialog({
        title: '永久删除',
        message: msg,
        confirmButtonText: '删除',
        confirmButtonColor: 'var(--van-danger-color)',
        showCancelButton: true,
      })

      // 执行删除
      const success = await wordsStore.deleteWords(targets, bid.value)
      if (success && isSelectMode.value) checkedIds.value = []
    } else {
      // 单词本模式：带选项的删除
      const msg = isBatch
        ? `确定从当前单词本中删除所选 ${targets.length} 个单词吗？`
        : `确定从当前单词本中删除单词"${targets[0]?.word}"吗？`

      const result = await showGlobalDialog({
        title: '删除单词',
        message: msg,
        confirmButtonText: '删除',
        confirmButtonColor: 'var(--van-danger-color)',
        showCancelButton: true,
        showCheckbox: true,
        checkboxLabel: '同时删除单词本身（若被其他单词本收录则保留）',
      })

      const deleteOrphans = typeof result === 'object' ? result.checked : false
      const success = await wordsStore.deleteWords(targets, bid.value, false, deleteOrphans)
      if (success && isSelectMode.value) checkedIds.value = []
    }
  } catch {
    // Cancelled
  }
}

const onBatchDelete = async () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  await handleDelete(targets)
}

const onBatchCancelReview = async () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  await handleRemoveFromReview(targets)
}

const handleAddToReview = async (targets: Word[]) => {
  if (targets.length === 0) return
  try {
    await showGlobalDialog({
      title: '加入复习',
      message: `确定将 ${targets.length > 1 ? `所选 ${targets.length} 个单词` : `单词"${targets[0]?.word}"`} 加入复习本吗？`,
      confirmButtonText: '加入',
      confirmButtonColor: 'var(--van-primary-color)',
      showCancelButton: true,
    })
    const success =
      targets.length === 1
        ? await wordsStore.addToReview(targets[0]!)
        : await wordsStore.batchAddToReview(targets)
    if (success && isSelectMode.value) checkedIds.value = []
  } catch {}
}

const onBatchBookmark = async () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  await handleAddToReview(targets)
}

const onWordItemClick = (w: Word) => {
  if (isSelectMode.value) {
    const idx = checkedIds.value.indexOf(w.id)
    if (idx === -1) checkedIds.value.push(w.id)
    else checkedIds.value.splice(idx, 1)
  } else {
    openWordCard(w)
  }
}

const openWordCard = (w: Word) => {
  wordsStore.setCurrentWord(w)
  const query: Record<string, string> = {}
  if (bid.value === 0) {
    query.single = 'true'
  }
  router.push({ path: `/books/${bid.value}/words/${w.id}`, query })
}

const { openMenu, AppMenu } = useAppMenu({
  showUser: false,
  showLogout: false,
  get items() {
    if (isSelectMode.value) {
      const actions = []
      if (checkedIds.value.length > 0) {
        if (isReviewMode.value) {
          actions.push({
            name: '取消复习',
            icon: 'bookmark-o',
            handler: onBatchCancelReview,
            color: 'var(--van-warning-color)',
          })
        } else {
          actions.push({
            name: '删除',
            icon: 'delete-o',
            handler: onBatchDelete,
            color: 'var(--van-danger-color)',
          })
          actions.push({
            name: '加入复习',
            icon: 'bookmark-o',
            handler: onBatchBookmark,
          })
          if (allowMove.value) {
            actions.push({
              name: moveActionConfig.value.text,
              icon: moveActionConfig.value.icon,
              handler: onBatchMove,
            })
          }
        }
      }
      actions.push({ name: '退出批量管理', icon: 'close', handler: () => toggleMode('select') })
      return actions
    }
    const items = []
    if (bid.value > 0 && !isReviewMode.value) {
      items.push({ name: '添加单词', icon: 'plus', handler: openAddWord })
    }
    if (isReviewMode.value) {
      items.push({ name: '复习指导', icon: 'info-o', handler: showReviewInfo })
    }
    if (bid.value === 0) {
      items.push({
        name: wordsStore.orphanFilter ? '显示全部单词' : '显示未入本单词',
        icon: wordsStore.orphanFilter ? 'bars' : 'failure',
        color: wordsStore.orphanFilter ? undefined : 'var(--van-warning-color)',
        handler: () => toggleOrphanFilter(),
      })
    }
    items.push(
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
    )
    return items
  },
})
</script>

<style scoped>
.words-manage-view {
  min-height: 100vh;
  padding-top: calc(var(--van-nav-bar-height) + var(--vnb-pad-top));
  background-color: var(--van-background);
}

.content {
  padding-top: 0px;
  padding-bottom: calc(var(--van-nav-bar-height) + var(--vnb-pad-bottom));
}

.loading {
  padding: 20px;
  text-align: center;
  color: var(--van-text-color-3);
}

/* 顶部搜索栏固定样式 */
.fixed-search {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding-top: var(--vnb-pad-top);
  box-sizing: content-box;
}

/* 图标点击样式 */
.van-icon {
  font-weight: 700;
  cursor: pointer;
}

.nav-bar-icon {
  font-size: 22px;
}

/* 顶部导航栏增加空白 */
:deep(.van-nav-bar--fixed) {
  padding-top: var(--vnb-pad-top);
  box-sizing: content-box;
  background-color: var(--vnb-nav-background);
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
  background: var(--vnb-nav-background);
  display: flex;
  align-items: center;
  z-index: 100;
  padding: 0 16px;
  padding-bottom: var(--vnb-pad-bottom);
  box-sizing: content-box;
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

.bottom-bar-icon.warning-icon {
  color: var(--van-warning-color);
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

.orphan-toggle-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 24px;
  color: var(--van-warning-color);
}

.orphan-toggle-btn.active {
  background-color: var(--van-warning-color);
  color: white;
}

.sort-wrapper {
  display: flex;
  align-items: center;
}

.belonging-books-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px 0;
}
.empty-text {
  text-align: center;
  padding: 20px;
  color: var(--van-gray-6);
}

.book-item :deep(.van-cell__left-icon) {
  color: var(--van-primary-color);
}

.belonging-books-content :deep(.van-cell-group)::after {
  border-bottom-width: 0;
}
</style>
