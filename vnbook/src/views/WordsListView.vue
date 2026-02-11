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
} = useWordOperations()

const bid = computed(() => Number(route.params.bid))
const isReviewMode = computed(() => bid.value === -1)
const showReviewGuide = ref(false)
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
    await addToReviewOp([w])
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
    await removeFromReviewOp([w])
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

onActivated(async () => {
  if (!authStore.isLoggedIn) return
  const newBid = bid.value

  if (currentBid.value !== newBid) {
    currentBid.value = newBid

    // 根据 URL 初始化选择模式（处理带查询参数的刷新）
    isSelectMode.value = route.query.select === 'true'
    // 切换单词本时重置搜索状态
    isSearchActive.value = false
    checkedIds.value = []

    loading.value = true
    wordsStore.clearWords()
    window.scrollTo(0, 0)

    // 从 URL 同步未入本过滤器状态（必须在 clearWords 之后）
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
    // 从 URL 同步未入本过滤器状态
    if (newBid === 0) {
      wordsStore.orphanFilter = route.query.orphan === 'true'
    } else {
      wordsStore.orphanFilter = false
    }

    // 从 URL 同步选择模式
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
