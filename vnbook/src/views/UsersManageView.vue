<template>
  <div class="users-manage-view">
    <van-nav-bar title="用户管理" fixed :placeholder="false" z-index="100">
      <template #left>
        <van-icon name="plus" class="nav-bar-icon" @click="openNewUser" />
      </template>
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <van-cell
            v-for="u in usersStore.users"
            :key="u.id"
            :title="u.dispname?.trim() || u.name"
            :label="u.name"
            is-link
            @click="editUser(u)"
          >
            <template #icon>
              <div class="icon-wrapper">
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

    <user-editor-dialog v-model="showEditor" :user="editorUser" @delete="deleteUser" />
    <van-dialog></van-dialog
    ><!-- 占位符，让showDialog样式统一 -->
  </div>
</template>

<script lang="ts">
export default {
  name: 'UsersManage',
}
</script>

<script setup lang="ts">
import { ref, onActivated } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { showDialog } from 'vant'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useAppMenu } from '@/composables/useAppMenu'
import UserEditorDialog from '@/components/UserEditorDialog.vue'
import type { User } from '@/types'

const usersStore = useUsersStore()
const authStore = useAuthStore()

const showEditor = ref(false)
const editorUser = ref<User | null>(null)
const refreshing = ref(false)
const loading = ref(true)

const scrollTop = ref(0)

onBeforeRouteLeave((to, from, next) => {
  scrollTop.value = window.scrollY
  next()
})

onActivated(async () => {
  if (!authStore.isLoggedIn) return
  if (scrollTop.value > 0) window.scrollTo(0, scrollTop.value)

  if (usersStore.users.length === 0) loading.value = true
  try {
    await usersStore.loadUsers()
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
})

const onRefresh = async () => {
  await usersStore.loadUsers()
  refreshing.value = false
}

const openNewUser = () => {
  editorUser.value = { id: 0, name: '', dispname: '', time_c: '', _new: 1 }
  showEditor.value = true
}

const { openMenu, AppMenu, UserDialog } = useAppMenu({
  items: [{ name: '新建用户', icon: 'plus', handler: openNewUser }],
  userIcon: 'manager-o',
})

const editUser = (u: User) => {
  editorUser.value = { ...u, _new: 0 }
  showEditor.value = true
}

const deleteUser = async (u: User) => {
  // 弹窗确认逻辑迁移到 View 层
  try {
    await showDialog({
      title: '删除用户',
      message: `确定要删除用户“${u.dispname?.trim() || u.name}”吗？<br><br><span style="color:var(--van-danger-color)"><b>此操作将永久删除该用户和其所有相关数据，且无法撤销。</b></span>`,
      confirmButtonText: '删除',
      confirmButtonColor: 'var(--van-danger-color)',
      cancelButtonText: '取消',
      showCancelButton: true,
      allowHtml: true,
    })
    await usersStore.deleteUser(u)
    editorUser.value = null
  } catch {
    // 用户点击取消，不做任何处理
  }
}
</script>

<style scoped>
.users-manage-view {
  min-height: 100vh;
  padding-top: var(--van-nav-bar-height);
  background-color: var(--van-background);
}

.content {
  padding-top: var(--van-nav-bar-height);
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
  color: var(--van-text-color);
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
</style>
