<template>
  <div class="users-manage-view">
    <van-nav-bar title="用户管理" :fixed="false" :placeholder="false" z-index="100">
      <template #left>
        <van-icon name="plus" class="nav-bar-icon" @click="openNewUser" />
      </template>
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="content" ref="contentRef" @scroll="onScroll">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="full-height-refresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <van-cell
            v-for="u in usersStore.users"
            :key="u.id"
            :title="u.dispname?.trim() || u.name"
            :label="u.name"
            is-link
            @click="enterUserDetail(u)"
          >
            <template #icon>
              <div class="icon-wrapper" @click.stop="openEditUser(u)">
                <van-icon name="user-o" class="list-leading-icon" />
              </div>
            </template>
          </van-cell>
          <van-empty
            v-if="usersStore.users.length === 0"
            description="暂无用户，点击左上角➕新建"
          />
        </div>
      </van-pull-refresh>
    </div>

    <AppMenu />
    <UserDialog />

    <user-editor-dialog v-model="showEditor" :user="editorUser" />
  </div>
</template>

<script lang="ts">
export default {
  name: 'UsersManage',
}
</script>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useAppMenu } from '@/composables/useAppMenu'
import { useScrollPosition } from '@/composables/useScrollPosition'
import { useUserOperations } from '@/composables/useUserOperations'
import UserEditorDialog from '@/components/UserEditorDialog.vue'
import type { User } from '@/types'

const usersStore = useUsersStore()
const authStore = useAuthStore()
const router = useRouter()

// 使用可复用的滚动位置管理
// contentRef 在 template 的 ref 和 @scroll 中使用（这是正常的 Vue 用法）
const { contentRef, onScroll, restoreScroll } = useScrollPosition('UsersManage')

// 使用可复用的用户操作逻辑
const { showEditor, editorUser, openNewUser, openEditUser } = useUserOperations()

const refreshing = ref(false)
const loading = ref(true)

onMounted(async () => {
  if (!authStore.isLoggedIn) return

  if (usersStore.users.length === 0) loading.value = true
  try {
    await usersStore.loadUsers()
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
})

// KeepAlive 恢复时恢复滚动位置
onActivated(() => {
  restoreScroll()
})

const onRefresh = async () => {
  await usersStore.loadUsers()
  refreshing.value = false
}

const { openMenu, AppMenu, UserDialog } = useAppMenu({
  items: [{ name: '新建用户', icon: 'plus', handler: openNewUser }],
  userIcon: 'manager-o',
  showAbout: true,
})

const enterUserDetail = (u: User) => {
  router.push(`/admin/users/${u.id}`)
}
</script>

<style scoped>
.users-manage-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 0;
  background-color: var(--van-background);
}

.content {
  flex: 1;
  overflow-y: auto;
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

/* 顶部导航栏样式 */
:deep(.van-nav-bar) {
  padding-top: calc(var(--vnb-pad-top) + env(safe-area-inset-top));
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

/* 确保单元格内容与图标对齐 */
:deep(.van-cell) {
  align-items: center;
}

.full-height-refresh {
  min-height: 100%;
}
</style>
