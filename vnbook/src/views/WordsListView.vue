<template>
  <div class="words-manage-view" @click="closeAllPopovers">
    <!-- 1. 顶部区域：作为 Flex 头部 (静态) -->
    <div class="top-bar-container">
      <van-search
        v-if="isSearchActive"
        ref="searchRef"
        v-model="searchText"
        show-action
        placeholder="搜索单词"
        shape="round"
        class="static-search"
        @update:model-value="onSearchUpdate"
        @cancel="exitSearchMode"
        @search="onSearchConfirm"
      />
      <van-nav-bar v-else :title="pageTitle" :fixed="false" :placeholder="false" z-index="100">
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

    <!-- 2. 滚动内容区域：flex: 1 -->
    <div class="content" ref="contentRef">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="full-height-refresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <div v-if="wordsStore.filteredWords.length > 0">
            <van-index-bar
              v-if="wordsStore.sortMode === 'alpha'"
              :index-list="indexList"
              :sticky="false"
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

    <!-- 3. 底部工具栏：作为 Flex 底部 (静态) -->
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
          <div v-if="isReviewMode" class="review-controls">
            <van-icon
              name="replay"
              class="bottom-bar-icon"
              :class="{ disabled: !isResetActive }"
              @click="onResetReview"
            />
            <div class="play-wrapper" @click="onPlayReview">
              <van-icon
                :name="hasActiveReview ? 'play-circle' : 'play-circle-o'"
                class="bottom-bar-icon large-icon play-icon"
                :class="{ breathing: hasActiveReview }"
              />
            </div>
            <van-icon name="info-o" class="bottom-bar-icon" @click="showReviewInfo" />
          </div>
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
import { computed, ref, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useWordsStore, type WordsStore } from '@/stores/words'
import { useAppMenu, type AppMenuItem } from '@/composables/useAppMenu'
import { usePopoverMap } from '@/composables/usePopoverMap'
import WordEditorDialog from '@/components/WordEditorDialog.vue'
import WordListItem from '@/components/WordListItem.vue'
import ReviewGuideDialog from '@/components/ReviewGuideDialog.vue'
import type { Word, SortMode, Book } from '@/types'
import { toast } from '@/utils/toast'
import type { SearchInstance, PopoverAction } from 'vant'
import { usePopupHistory } from '@/composables/usePopupHistory'
import { useWordOperations } from '@/composables/useWordOperations'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()
const wordsStore: WordsStore = useWordsStore()
const {
  handleAddToReview: addToReviewOp,
  handleRemoveFromReview: removeFromReviewOp,
  handleDelete,
  handleMove,
  showMoveSheet,
  moveTargetOptions,
  onMoveConfirm,
  showWordEditor,
  editingWord,
  openAddWord,
  handleStartReview,
  handleResetReview,
} = useWordOperations()

const bid = computed(() => Number(route.params.bid))
const isReviewMode = computed(() => bid.value === -1)
const isResetActive = computed(() => {
  return wordsStore.words.some((w) => (w.last_status || 0) !== 0)
})

const hasActiveReview = computed(() => {
  return isResetActive.value
})

const showReviewGuide = ref(false)
const refreshing = ref(false)
const loading = ref(true)
type ListMode = 'none' | 'edit' | 'audio'
const savedMode = authStore.userInfo?.cfg?.wordsListMode
const defaultMode = savedMode === 'edit' || savedMode === 'audio' ? savedMode : 'none'
const mode = ref<ListMode>(defaultMode)
const isSelectMode = ref(route.query.select === 'true')
const checkedIds = ref<number[]>([])

// 监听 URL 参数变化，确保选择模式状态与 URL 保持一致
watch(
  () => route.query.select,
  (val) => {
    isSelectMode.value = val === 'true'
  },
)

const currentBid = ref<number | null>(null)
const searchText = ref('')
const isSearchActive = ref(false)
const searchRef = ref<SearchInstance | null>(null)
const contentRef = ref<HTMLElement | null>(null)

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
    // 普通视图里不用弹出确认对话框
    await addToReviewOp([w], false)
  } else if (action.key === 'books') {
    const result = await wordsStore.getBelongingBooks(w.id)
    if (result) {
      belongingBooksList.value = result.books
      wordInReview.value = result.inReview
      showBelongingBooks.value = true
    } else {
      toast.showFail('获取失败')
    }
  } else if (action.key === 'remove-review') {
    // 复习本视图里需要确认，普通视图不需要
    await removeFromReviewOp([w], isReviewMode.value)
  } else if (action.key === 'move') {
    handleMove([w], bid.value)
  } else if (action.key === 'delete') {
    await handleDelete([w], bid.value)
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

// 核心逻辑：监听路由参数 bid 的变化
// 当 bid 变化时（说明切换了单词本），重置数据并滚动到顶部
// 当 bid 不变时（说明是从详情页返回），不做任何操作，保留 DOM 和滚动位置
const loadData = async (newBid: number) => {
  currentBid.value = newBid

  // 重置状态
  isSelectMode.value = route.query.select === 'true'
  isSearchActive.value = false
  checkedIds.value = []
  loading.value = true
  wordsStore.clearWords()

  // 滚动到顶部 (因为是新页面)
  // 修复：直接使用 contentRef 滚动内部容器，而不是查找 DOM
  contentRef.value?.scrollTo(0, 0)

  // 同步过滤器
  if (newBid === 0) {
    wordsStore.orphanFilter = route.query.orphan === 'true'
  } else {
    wordsStore.orphanFilter = false
  }

  // 加载数据
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
}

// 监听路由参数变化
watch(
  () => [route.name, route.params.bid],
  ([newName, newBid]) => {
    // 当路由切换回 WordsList 时，如果 bid 发生了变化，或者当前从未加载过数据（currentBid 为 null，对应刷新后回退的场景），则执行加载
    if (newName === 'WordsList' && newBid) {
      const bidNum = Number(newBid)
      if (bidNum !== currentBid.value) {
        loadData(bidNum)
      }
    }
  },
)

// 专门监听 addWord 参数，确保无论是首次加载还是路由切换都能触发
watch(
  () => route.query.addWord,
  async (val) => {
    if (val === 'true') {
      // 清除 URL 参数，防止刷新或再次进入时重复打开
      await router.replace({ query: { ...route.query, addWord: undefined } })
      openAddWord()
    }
  },
  { immediate: true },
)

// 首次挂载时加载
onMounted(() => {
  if (!authStore.isLoggedIn) return
  if (route.name === 'WordsList' && !isNaN(bid.value)) {
    loadData(bid.value)
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

const onResetReview = async () => {
  if (!isResetActive.value) return
  await handleResetReview()
}

const onPlayReview = () => handleStartReview(bid.value)

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

const onBatchMove = () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  handleMove(targets, bid.value, () => {
    if (isSelectMode.value) checkedIds.value = []
  })
}

const onBatchDelete = async () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  const success = await handleDelete(targets, bid.value)
  if (success && isSelectMode.value) checkedIds.value = []
}

const onBatchCancelReview = async () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  const success = await removeFromReviewOp(targets)
  if (success && isSelectMode.value) checkedIds.value = []
}

const onBatchBookmark = async () => {
  if (checkedIds.value.length === 0) return
  const targets = wordsStore.words.filter((w) => checkedIds.value.includes(w.id))
  const success = await addToReviewOp(targets)
  if (success && isSelectMode.value) checkedIds.value = []
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
  // Review Mode: preserve review state
  if (isReviewMode.value) {
    query.review = 'true'
  }
  router.push({ path: `/books/${bid.value}/words/${w.id}`, query })
}

const menuItems = computed<AppMenuItem[]>(() => {
  if (isSelectMode.value) {
    const actions: AppMenuItem[] = []
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
  const items: AppMenuItem[] = []

  if (isReviewMode.value) {
    items.push({
      name: hasActiveReview.value ? '继续复习' : '开始复习',
      icon: hasActiveReview.value ? 'play-circle' : 'play-circle-o',
      color: hasActiveReview.value ? 'var(--van-primary-color)' : undefined,
      handler: onPlayReview,
    })
    items.push({
      name: '重置复习',
      icon: 'replay',
      disabled: !isResetActive.value,
      handler: onResetReview,
    })
  }

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
        mode.value === 'edit' ? '关闭编辑栏' : mode.value === 'audio' ? '显示编辑栏' : '显示语音栏',
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
})

const { openMenu, AppMenu } = useAppMenu({
  showUser: false,
  showLogout: false,
  items: menuItems,
})
</script>

<style scoped>
.words-manage-view {
  height: 100%; /* 占满父容器 */
  display: flex;
  flex-direction: column;
  padding-top: 0;
  background-color: var(--van-background);
  box-sizing: border-box;
}

.content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.loading {
  padding: 20px;
  text-align: center;
  color: var(--van-text-color-3);
}

.top-bar-container {
  flex-shrink: 0; /* 关键：防止顶部栏被压缩 */
}

/* 顶部搜索栏样式 */
.static-search {
  z-index: 100;
  padding-top: calc(var(--vnb-pad-top) + env(safe-area-inset-top));
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

/* 顶部导航栏样式 */
:deep(.van-nav-bar) {
  padding-top: calc(var(--vnb-pad-top) + env(safe-area-inset-top));
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
  /* 移除 fixed，改为 Flex 布局的自然底部 */
  position: relative;
  flex-shrink: 0;
  height: var(--van-nav-bar-height);
  background: var(--vnb-nav-background);
  display: flex;
  align-items: center;
  z-index: 100;
  padding: 0 16px;
  padding-bottom: calc(var(--vnb-pad-bottom) + env(safe-area-inset-bottom, 0));
  box-sizing: border-box;
}

.bottom-bar-left {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
}

.bottom-bar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
}

.bottom-bar-center {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
}

.review-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.play-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.play-icon {
  color: var(--van-primary-color);
  font-size: 32px;
  transition: all 0.3s;
}
.play-icon.breathing {
  color: var(--van-primary-color);
  animation: breathing 2s infinite ease-in-out;
}

@keyframes breathing {
  0% {
    transform: scale(1);
    text-shadow: 0 0 0 rgba(25, 137, 250, 0);
  }
  50% {
    transform: scale(1.1);
    text-shadow: 0 0 10px rgba(25, 137, 250, 0.5);
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 0 rgba(25, 137, 250, 0);
  }
}

.bottom-bar-icon {
  font-size: 22px;
  color: var(--van-nav-bar-icon-color);
  padding: 2px;
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

/* 调整索引栏样式 */
:deep(.van-index-anchor) {
  /* 隐藏索引锚点条，只保留右侧索引功能 */
  height: 0 !important;
  padding: 0 !important;
  overflow: hidden;
  line-height: 0 !important;
  border: none !important;
  background: transparent !important;
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

.full-height-refresh {
  min-height: 100%;
}
</style>
