<template>
  <div class="users-manage-view">
    <van-nav-bar title="用户管理" fixed placeholder>
      <template #left>
        <van-icon name="plus" size="22" @click="openNewUser" />
      </template>
      <template #right>
        <van-icon name="ellipsis" size="22" @click="openMenu" />
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
              <van-icon name="user-o" class="user-list-icon" />
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

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showDialog } from 'vant'
import { useUsersStore } from '@/stores/users'
import { useAppMenu } from '@/composables/useAppMenu'
import UserEditorDialog from '@/components/UserEditorDialog.vue'
import type { User } from '@/types'

const usersStore = useUsersStore()

const showEditor = ref(false)
const editorUser = ref<User | null>(null)
const refreshing = ref(false)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
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

/* 用户列表 图标优化 */
:deep(.user-list-icon) {
  font-size: 24px;
  margin-right: 12px;
  color: var(--van-primary-color);
  display: flex;
  align-items: center;
  height: 100%; /* 确保在 Cell 容器中垂直居中 */
}

/* 确保单元格内容与图标对齐 */
:deep(.van-cell) {
  align-items: center;
}
</style>
