<template>
  <div class="user-info-view">
    <van-nav-bar :title="pageTitle" :fixed="false" :placeholder="false" z-index="100">
      <template #left>
        <van-icon name="arrow-left" class="nav-bar-icon" @click="goBack" />
      </template>
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="content">
      <van-cell-group inset class="stats-group">
        <van-cell title="单词本数" :value="stats.bookCount" icon="label-o" />
        <van-cell title="单词总数" :value="stats.wordCount" icon="notes-o" />
        <van-cell title="上次在线" :value="formattedLastActive" icon="clock-o" />
      </van-cell-group>

      <div class="action-group">
        <van-button block icon="edit" @click="onEditUser">编辑用户</van-button>
        <van-button block icon="warning-o" class="warning-btn" @click="onClearData"
          >清空数据</van-button
        >
        <van-button block icon="delete-o" class="danger-btn" @click="onDeleteUser"
          >删除用户</van-button
        >
      </div>
    </div>

    <AppMenu />

    <user-editor-dialog v-model="showEditor" :user="editorUser" />
  </div>
</template>

<script lang="ts">
export default {
  name: 'UserInfo',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useAppMenu } from '@/composables/useAppMenu'
import { useUserOperations } from '@/composables/useUserOperations'
import { getUserStats, type UserStats } from '@/api/users'
import UserEditorDialog from '@/components/UserEditorDialog.vue'

const route = useRoute()
const router = useRouter()
const usersStore = useUsersStore()

// 使用可复用的用户操作逻辑
const { showEditor, editorUser, openEditUser, handleDeleteUserWithVerify, handleClearUserData } =
  useUserOperations()

// 用户统计数据
const stats = ref<UserStats>({ bookCount: 0, wordCount: 0, lastActive: '-' })

// 获取用户信息
const userId = computed(() => Number(route.params.uid))
const user = computed(() => usersStore.users.find((u) => u.id === userId.value))

// 页面标题：显示名 (用户名)
const pageTitle = computed(() => {
  if (!user.value) return '用户信息'
  const displayName = user.value.dispname?.trim() || user.value.name
  return `${displayName} (${user.value.name})`
})

// 将 UTC 时间字符串转换为本地时间
const formatLocalTime = (utcTime: string): string => {
  if (!utcTime || utcTime === '-') return '-'
  // 解析 UTC 时间格式 "Y/m/d H:i" -> "Y-m-dTH:i:00Z"
  const normalized = utcTime.replace(/\//g, '-').replace(' ', 'T') + ':00Z'
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return utcTime
  // 格式化为本地时间
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

// 格式化后的上次活跃时间
const formattedLastActive = computed(() => formatLocalTime(stats.value.lastActive))

// 确保用户数据已加载
onMounted(async () => {
  if (usersStore.users.length === 0) {
    await usersStore.loadUsers()
  }
  // 加载用户统计
  const response = await getUserStats(userId.value)
  if (response.data.success && response.data.stats) {
    stats.value = response.data.stats
  }
})

const goBack = () => {
  router.back()
}

const onEditUser = () => {
  if (user.value) {
    openEditUser(user.value)
  }
}

const onClearData = async () => {
  if (!user.value) return
  const success = await handleClearUserData(user.value)
  if (success) {
    // 重新获取统计数据
    const response = await getUserStats(userId.value)
    if (response.data.success && response.data.stats) {
      stats.value = response.data.stats
    }
  }
}

const onDeleteUser = async () => {
  if (!user.value) return
  const success = await handleDeleteUserWithVerify(user.value)
  if (success) {
    router.back()
  }
}

const { openMenu, AppMenu } = useAppMenu({
  items: [
    { name: '编辑用户', icon: 'edit', handler: onEditUser },
    {
      name: '清空数据',
      icon: 'warning-o',
      color: 'var(--van-warning-color)',
      handler: onClearData,
    },
    { name: '删除用户', icon: 'delete-o', color: 'var(--van-danger-color)', handler: onDeleteUser },
  ],
  showUser: false,
  showLogout: false,
})
</script>

<style scoped>
.user-info-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 0;
  background-color: var(--van-background);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.stats-group {
  margin-top: 8px;
}

.action-group {
  margin: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-group .van-button {
  border-radius: var(--van-radius-lg);
  border: none;
  font-size: var(--van-font-size-md);
  font-weight: 600;
}

.warning-btn {
  color: var(--van-warning-color);
}

.danger-btn {
  color: var(--van-danger-color);
}

.content :deep(.van-cell) {
  padding: 10px 8px;
}

.content :deep(.van-cell__title) {
  flex: none;
  width: auto;
  margin-right: 12px;
  font-size: var(--van-font-size-md);
  font-weight: 600;
}

.content :deep(.van-cell__value) {
  color: var(--van-text-color-2);
  font-size: var(--van-font-size-sm);
  flex: 1;
  word-break: break-all;
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
  font-size: var(--van-font-size-lg);
}
</style>
