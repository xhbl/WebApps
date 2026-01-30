<template>
  <div class="users-manage-view">
    <van-nav-bar title="用户管理" fixed placeholder>
      <template #left>
        <van-icon name="plus" size="22" @click="openNewUser" />
      </template>
      <template #right>
        <van-icon name="ellipsis" size="22" @click="showActionSheet = true" />
      </template>
    </van-nav-bar>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <van-cell
            v-for="u in usersStore.users"
            :key="u.id"
            :title="u.dispname || u.name"
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

    <van-action-sheet
      v-model:show="showActionSheet"
      :actions="actions"
      cancel-text="取消"
      @select="onMenuSelect"
    />

    <user-mod-dialog v-model="showUserMod" />

    <user-editor-dialog
      v-model="showEditor"
      :user="editorUser"
      @save="saveUser"
      @delete="deleteUser"
    />
    <van-dialog></van-dialog
    ><!-- 占位符，让showDialog样式统一 -->
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { showDialog } from 'vant'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import UserEditorDialog from '@/components/UserEditorDialog.vue'
import UserModDialog from '@/components/UserModDialog.vue'
import type { User, MenuAction } from '@/types'

const usersStore = useUsersStore()
const authStore = useAuthStore()

const showActionSheet = ref(false)
const showEditor = ref(false)
const showUserMod = ref(false)
const editorUser = ref<User | null>(null)
const refreshing = ref(false)
const loading = ref(true)

// 修改点：在 actions 中增加了 icon 和 color
const actions = computed<MenuAction[]>(() => [
  {
    name: '新建用户',
    key: 'new',
    icon: 'plus',
  },
  {
    name: `${authStore.userInfo?.dname?.trim() ? authStore.userInfo.dname : authStore.userInfo?.uname}`,
    key: 'mod',
    icon: 'manager-o',
  },
  {
    name: '退出登录',
    key: 'logout',
    icon: 'close',
    color: 'var(--van-warning-color)',
  },
])

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

const editUser = (u: User) => {
  editorUser.value = { ...u, _new: 0 }
  showEditor.value = true
}

const saveUser = async (u: User) => {
  await usersStore.saveUser(u)
  editorUser.value = null
}

const deleteUser = async (u: User) => {
  // 弹窗确认逻辑迁移到 View 层
  try {
    await showDialog({
      title: '删除用户',
      message: `确定要删除用户“${u.dispname || u.name}”吗？<br><br><span style="color:var(--van-danger-color)"><b>此操作将永久删除该用户所有相关数据，且无法撤销。</b></span>`,
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

const onMenuSelect = (action: MenuAction) => {
  showActionSheet.value = false

  switch (action.key) {
    case 'new':
      openNewUser()
      break
    case 'mod':
      showUserMod.value = true
      break
    case 'logout':
      const userName = authStore.userInfo?.dname?.trim()
        ? authStore.userInfo.dname
        : authStore.userInfo?.uname || '请确认'
      showDialog({
        title: userName,
        message: '确定要退出登录吗？',
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        showCancelButton: true,
      })
        .then(async () => {
          // 点击确认按钮
          await authStore.logout()
        })
        .catch(() => {
          // 点击取消按钮，不进行任何操作
        })
      break
  }
}
</script>

<style scoped>
.users-manage-view {
  min-height: 100vh;
  background-color: var(--van-background);
}

.content {
  padding-top: 4px;
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
