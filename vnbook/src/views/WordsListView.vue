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
              :sticky-offset-top="46"
            >
              <van-checkbox-group v-model="checkedIds">
                <div v-for="group in wordsStore.groupedWords" :key="group.key">
                  <van-index-anchor :index="group.key" />
                  <word-list-item
                    v-for="w in group.words"
                    :key="w.id"
                    :word="w"
                    :mode="mode"
                    :show-popover="showWordPopover[w.id] ?? false"
                    :popover-placement="getWordPopoverPlacement(w)"
                    :highlight="wordsStore.searchKeyword"
                    :delete-text="deleteActionText"
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
                :mode="mode"
                :show-popover="showWordPopover[w.id] ?? false"
                :popover-placement="getWordPopoverPlacement(w)"
                :highlight="wordsStore.searchKeyword"
                :delete-text="deleteActionText"
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
            :name="bid === 0 ? 'delete-o' : 'failure'"
            class="bottom-bar-icon"
            :class="{
              disabled: checkedIds.length === 0,
              'danger-icon': checkedIds.length > 0 && bid === 0,
              'warning-icon': checkedIds.length > 0 && bid !== 0,
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
            v-if="bid > 0"
            name="plus"
            class="bottom-bar-icon large-icon"
            @click="openAddWord"
          />
          <div
            v-else-if="bid === 0"
            class="orphan-toggle-btn"
            :class="{ active: wordsStore.orphanFilter }"
            @click="wordsStore.toggleOrphanFilter"
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
    <word-editor-dialog
      v-model="showWordEditor"
      :bid="bid"
      :word="editingWord"
      @update:word="editingWord = $event"
    />
  </div>
</template>

<script lang="ts">
export default {
  name: 'WordsList',
}
</script>

<script setup lang="ts">
import { computed, ref, onActivated, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { showDialog } from 'vant'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useWordsStore, type WordsStore } from '@/stores/words'
import { useAppMenu } from '@/composables/useAppMenu'
import { usePopoverMap } from '@/composables/usePopoverMap'
import WordEditorDialog from '@/components/WordEditorDialog.vue'
import WordListItem from '@/components/WordListItem.vue'
import type { Word } from '@/types'
import { toast } from '@/utils/toast'
import * as wordsApi from '@/api/words'
import type { SearchInstance } from 'vant'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const authStore = useAuthStore()
const wordsStore: WordsStore = useWordsStore()

const bid = computed(() => Number(route.params.bid))
const showWordEditor = ref(false)
const editingWord = ref<Word | null>(null)
const refreshing = ref(false)
const loading = ref(true)
type ViewMode = 'none' | 'edit' | 'audio' | 'select'
const savedMode = authStore.userInfo?.cfg?.wordsListMode
const mode = ref<ViewMode>(savedMode === 'edit' || savedMode === 'audio' ? savedMode : 'none')
const previousMode = ref<ViewMode>('none')
const checkedIds = ref<number[]>([])

const scrollTop = ref(0)
const currentBid = ref<number | null>(null)
const searchText = ref('')
const isSearchActive = ref(false)
const searchRef = ref<SearchInstance | null>(null)

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

const deleteActionText = computed(() => (bid.value === 0 ? '删除' : '移除'))

const onWordAction = async (action: { key: string }, w: Word) => {
  showWordPopover.value[w.id] = false
  if (action.key === 'edit') {
    wordsStore.setCurrentWord(w)
    router.push({
      path: `/books/${bid.value}/words/${w.id}`,
      query: { single: 'true', edit: 'true' },
    })
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

    if (mode.value === 'select') {
      mode.value = previousMode.value
    }
    // 切换单词本时重置搜索状态
    isSearchActive.value = false
    checkedIds.value = []

    loading.value = true
    wordsStore.clearWords()
    window.scrollTo(0, 0)

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
    if (scrollTop.value > 0) window.scrollTo(0, scrollTop.value)
    await wordsStore.loadWords(newBid)
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

const onSearchUpdate = (val: string) => wordsStore.setSearchKeyword(val)

const onSearchConfirm = () => searchRef.value?.blur()

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

const isSelectMode = computed(() => mode.value === 'select')

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

const handleDelete = async (targets: Word[]) => {
  if (targets.length === 0) return

  const isAllWords = bid.value === 0
  const isBatch = targets.length > 1
  const actionText = isAllWords ? '删除' : '移除'
  const confirmButtonColor = isAllWords ? 'var(--van-danger-color)' : 'var(--van-warning-color)'

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

        await showDialog({
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

      await showDialog({
        title: '永久删除',
        message: msg,
        confirmButtonText: '删除',
        confirmButtonColor: 'var(--van-danger-color)',
        showCancelButton: true,
      })
    } else {
      // 单词本模式：仅移除映射
      const msg = isBatch
        ? `确定从当前单词本中移除 所选 ${targets.length} 个单词吗？`
        : `确定从当前单词本中移除 单词"${targets[0]?.word}"吗？`

      await showDialog({
        title: '确认移除',
        message: msg,
        confirmButtonText: '移除',
        confirmButtonColor: 'var(--van-warning-color)',
        showCancelButton: true,
      })
    }

    // 执行操作
    const success = await wordsStore.deleteWords(targets, bid.value)
    if (success) {
      // 如果是批量操作，清空选择
      if (mode.value === 'select') {
        checkedIds.value = []
      }
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
    const items = []
    if (bid.value > 0) {
      items.push({ name: '添加单词', icon: 'plus', handler: openAddWord })
    }
    if (bid.value === 0) {
      items.push({
        name: wordsStore.orphanFilter ? '显示全部单词' : '显示未入本单词',
        icon: wordsStore.orphanFilter ? 'bars' : 'failure',
        color: wordsStore.orphanFilter ? undefined : 'var(--van-warning-color)',
        handler: () => wordsStore.toggleOrphanFilter(),
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
      {
        name: wordsStore.sortMode === 'alpha' ? '关闭字母排序' : '按字母排序',
        icon: 'sort',
        handler: () => wordsStore.toggleSortMode(),
      },
    )
    return items
  },
})
</script>

<style scoped>
.words-manage-view {
  min-height: 100vh;
  padding-top: var(--van-nav-bar-height);
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

/* 顶部搜索栏固定样式 */
.fixed-search {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
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
</style>
