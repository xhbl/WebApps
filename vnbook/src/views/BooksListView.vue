<template>
  <div class="books-manage-view" @click="closeAllPopovers">
    <van-nav-bar :title="userBookTitle" fixed :placeholder="false" z-index="100">
      <template #left>
        <van-icon name="plus" class="nav-bar-icon" @click="openAddBook" />
      </template>
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <!-- 置顶区域 (全部单词 + 复习本) -->
    <div class="sticky-header">
      <div v-if="showReviewBook" class="van-hairline--bottom">
        <van-cell
          title="复习本"
          :label="`单词数:${booksStore.reviewCount}`"
          is-link
          @click="enterReviewBook"
          class="all-words-cell"
        >
          <template #icon>
            <div class="icon-wrapper" @click.stop>
              <van-popover
                v-model:show="popoverMap['review']"
                :actions="reviewBookPopoverActions"
                placement="bottom-start"
                @select="onReviewBookAction"
                @open="onPopoverOpen('review')"
              >
                <template #reference>
                  <van-icon name="bookmark" class="list-leading-icon" />
                </template>
              </van-popover>
            </div>
          </template>
          <template #right-icon>
            <img src="/resources/icons/vnb-review.png" class="right-more-icon" />
          </template>
        </van-cell>
      </div>
    </div>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <van-cell
            v-for="(b, index) in booksStore.books"
            :key="b.id"
            :title="b.title"
            :label="`单词数: ${b.nums}`"
            is-link
            :class="{ 'pinned-book': b.ptop === 1 }"
            @click="enterWordsList(b)"
          >
            <template #icon>
              <div class="icon-wrapper" @click.stop>
                <van-popover
                  v-model:show="popoverMap[b.id]"
                  :actions="getBookActions(b)"
                  :placement="getBookPopoverPlacement(index)"
                  @select="(action) => onBookAction(action, b)"
                  @open="onPopoverOpen(b.id)"
                >
                  <template #reference>
                    <van-icon name="label-o" class="list-leading-icon" />
                  </template>
                </van-popover>
              </div>
            </template>
            <template #right-icon>
              <img src="/resources/icons/vnb-more.png" class="right-more-icon" />
            </template>
          </van-cell>
          <van-cell
            v-if="showAllWords"
            title="全部单词"
            :label="`单词总数：${totalWords}`"
            is-link
            @click="enterAllWords"
            class="all-words-cell"
          >
            <template #icon>
              <div class="icon-wrapper" @click.stop>
                <van-popover
                  v-model:show="popoverMap['all']"
                  :actions="allWordsPopoverActions"
                  :placement="booksStore.books.length > 5 ? 'top-start' : 'bottom-start'"
                  @select="onAllWordsAction"
                  @open="onPopoverOpen('all')"
                >
                  <template #reference>
                    <van-icon name="label" class="list-leading-icon" />
                  </template>
                </van-popover>
              </div>
            </template>
            <template #right-icon>
              <img src="/resources/icons/vnb-all.png" class="right-more-icon" />
            </template>
          </van-cell>
          <van-empty
            v-if="booksStore.books.length === 0"
            description="暂无单词本，点击左上角➕新建"
          />
        </div>
      </van-pull-refresh>
    </div>

    <AppMenu />
    <UserDialog />
    <book-editor-dialog
      v-model="showBookEditor"
      :book="editingBook"
      @update:book="editingBook = $event"
      @delete="handleDeleteBook"
    />
  </div>
</template>

<script lang="ts">
export default {
  name: 'BooksList',
}
</script>

<script setup lang="ts">
import { computed, ref, onActivated } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useBooksStore } from '@/stores/books'
import { useAuthStore } from '@/stores/auth'
import { useAppMenu } from '@/composables/useAppMenu'
import { usePopoverMap } from '@/composables/usePopoverMap'
import { useBookOperations } from '@/composables/useBookOperations'
import BookEditorDialog from '@/components/BookEditorDialog.vue'
import type { Book } from '@/types'

const booksStore = useBooksStore()
const authStore = useAuthStore()
const router = useRouter()
const {
  showBookEditor,
  editingBook,
  openAddBook,
  openEditBook,
  handleDeleteBook,
  handlePinBook,
  handleMoveBook,
} = useBookOperations()

const enterWordsList = (b: Book) => {
  // 跳转到单词本详情页（WordsListView）
  router.push(`/books/${b.id}/words`)
}
const enterAllWords = () => {
  router.push(`/books/0/words`)
}
const enterReviewBook = () => {
  router.push(`/books/-1/words`)
}

const refreshing = ref(false)
const loading = ref(true)

const userBookTitle = computed(() => {
  return authStore.userDisplayName ? `${authStore.userDisplayName}的单词本` : '我的单词本'
})

// 初始化 showAllWords 状态
const showAllWords = ref(!authStore.userInfo?.cfg?.hideAllWords)
const showReviewBook = ref(!authStore.userInfo?.cfg?.hideReviewBook)

const totalWords = computed(() => {
  return booksStore.books.reduce((sum, b) => sum + b.nums, 0)
})

const scrollTop = ref(0)

onBeforeRouteLeave((to, from, next) => {
  scrollTop.value = window.scrollY
  next()
})

onActivated(async () => {
  if (!authStore.isLoggedIn) return
  if (scrollTop.value > 0) window.scrollTo(0, scrollTop.value)

  if (booksStore.books.length === 0) loading.value = true
  try {
    await booksStore.loadBooks()
  } catch (error) {
    console.error('Failed to load books:', error)
  } finally {
    loading.value = false
  }
})

const onRefresh = async () => {
  refreshing.value = true
  await booksStore.loadBooks()
  refreshing.value = false
}

const { popoverMap, onOpen: onPopoverOpen, closeAll: closeAllPopovers } = usePopoverMap()

const allWordsPopoverActions = [{ text: '隐藏', icon: 'closed-eye', key: 'hide' }]

const onAllWordsAction = (action: { key: string }) => {
  if (action.key === 'hide') {
    popoverMap.value['all'] = false
    showAllWords.value = false
    authStore.updateUserConfig({ hideAllWords: true })
  }
}

const reviewBookPopoverActions = [{ text: '隐藏', icon: 'closed-eye', key: 'hide' }]

const onReviewBookAction = (action: { key: string }) => {
  if (action.key === 'hide') {
    popoverMap.value['review'] = false
    showReviewBook.value = false
    authStore.updateUserConfig({ hideReviewBook: true })
  }
}

const toggleShowAllWords = () => {
  showAllWords.value = !showAllWords.value
  authStore.updateUserConfig({ hideAllWords: !showAllWords.value })
}

const toggleShowReviewBook = () => {
  showReviewBook.value = !showReviewBook.value
  authStore.updateUserConfig({ hideReviewBook: !showReviewBook.value })
}

const getBookPopoverPlacement = (index: number) => {
  // 当列表较长（超过5个）且是最后两项时，向上弹出菜单，防止被底部遮挡
  if (booksStore.books.length > 5 && index >= booksStore.books.length - 2) {
    return 'top-start'
  }
  return 'bottom-start'
}

const getBookActions = (b: Book) => {
  const actions = [{ text: '编辑', icon: 'edit', key: 'edit' }]

  // 置顶/取消置顶
  actions.push({
    text: b.ptop === 1 ? '取消置顶' : '置顶',
    icon: b.ptop === 1 ? 'down' : 'back-top',
    key: 'pin',
  })

  // 计算同组位置
  const group = booksStore.books.filter((item) => !!item.ptop === !!b.ptop)
  const index = group.findIndex((item) => item.id === b.id)

  // 上移 (不是第一个)
  if (index > 0) {
    actions.push({ text: '上移', icon: 'arrow-up', key: 'up' })
  }
  // 下移 (不是最后一个)
  if (index < group.length - 1) {
    actions.push({ text: '下移', icon: 'arrow-down', key: 'down' })
  }

  return actions
}

const onBookAction = (action: { key: string }, b: Book) => {
  popoverMap.value[b.id] = false
  if (action.key === 'edit') {
    popoverMap.value[b.id] = false
    openEditBook(b)
  } else if (action.key === 'pin') {
    handlePinBook(b)
  } else if (action.key === 'up') {
    handleMoveBook(b, -1)
  } else if (action.key === 'down') {
    handleMoveBook(b, 1)
  }
}

const { openMenu, AppMenu, UserDialog } = useAppMenu({
  get items() {
    return [
      { name: '新建单词本', icon: 'plus', handler: openAddBook },
      {
        name: showReviewBook.value ? '隐藏[复习本]' : '显示[复习本]',
        icon: showReviewBook.value ? 'closed-eye' : 'eye-o',
        handler: toggleShowReviewBook,
      },
      {
        name: showAllWords.value ? '隐藏[全部单词]' : '显示[全部单词]',
        icon: showAllWords.value ? 'closed-eye' : 'eye-o',
        handler: toggleShowAllWords,
      },
    ]
  },
})
</script>

<style scoped>
.books-manage-view {
  min-height: 100vh;
  padding-top: calc(var(--van-nav-bar-height) + var(--vnb-pad-top));
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

.nav-bar-icon {
  font-size: 22px;
}

/* 顶部导航栏增加空白 */
:deep(.van-nav-bar--fixed) {
  padding-top: var(--vnb-pad-top);
  box-sizing: content-box;
  background-color: var(--vnb-nav-background);
}

/* 优化 ActionSheet 内部图标间距 */
:deep(.van-action-sheet__item) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
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

/* 列表前导图标 */
.list-leading-icon {
  font-size: 22px;
  color: var(--van-primary-color);
  display: flex;
  align-items: center;
  height: 100%; /* 确保在 Cell 容器中垂直居中 */
}

/* 确保单元格内容与图标对齐 */
:deep(.van-cell) {
  align-items: center;
}

.sticky-header {
  position: sticky;
  top: calc(var(--van-nav-bar-height) + var(--vnb-pad-top));
  z-index: 10;
}

.all-words-cell {
  background-color: var(--van-gray-1); /* 灰色背景 */
  align-items: center;
}

.pinned-book {
  background-color: var(--van-gray-2); /* 置顶项灰色背景 */
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 40px; /* 扩大点击宽度 */
  height: 44px; /* 扩大点击高度 */
  margin-left: -16px; /* 向左延伸至边缘 */
  padding-left: 10px; /* 修正图标视觉位置 */
  margin-right: 2px;
  cursor: pointer;
}

.right-more-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
</style>
