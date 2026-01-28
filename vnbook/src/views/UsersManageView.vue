<template>
  <div class="users-manage-view">
    <van-nav-bar title="用户管理" fixed placeholder>
      <template #left>
        <van-icon name="plus" size="18" @click="openNewUser" />
      </template>
      <template #right>
        <van-icon name="ellipsis" size="18" @click="showActionSheet = true" />
      </template>
    </van-nav-bar>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <van-cell
            v-for="u in usersStore.users"
            :key="u.Id"
            :title="u.dispname"
            :label="u.name"
            is-link
            @click="editUser(u)"
          >
            <template #icon>
              <van-icon name="user-o" style="margin-right: 8px" />
            </template>
          </van-cell>
          <van-empty
            v-if="usersStore.users.length === 0"
            description="暂无用户，点击左上角➕新建"
          />
        </div>
      </van-pull-refresh>
    </div>

    <van-action-sheet v-model:show="showActionSheet" :actions="actions" @select="onMenuSelect" />

    <user-editor-dialog
      v-model="showEditor"
      :user="editorUser"
      @save="saveUser"
      @delete="deleteUser"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import UserEditorDialog from '@/components/UserEditorDialog.vue'
import type { User, MenuAction } from '@/types'

const router = useRouter()
const usersStore = useUsersStore()
const authStore = useAuthStore()

const showActionSheet = ref(false)
const showEditor = ref(false)
const editorUser = ref<User | null>(null)
const refreshing = ref(false)
const loading = ref(true)

const actions: MenuAction[] = [
  { name: '新建用户', key: 'new' },
  { name: '注销', key: 'logout' },
]

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
  editorUser.value = { Id: 0, name: '', dispname: '', time_c: '', _new: 1 }
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
  await usersStore.deleteUser(u)
  editorUser.value = null
}

const onMenuSelect = (action: MenuAction) => {
  showActionSheet.value = false

  switch (action.key) {
    case 'new':
      openNewUser()
      break
    case 'logout':
      authStore.logout()
      // logout() 会自动跳转到登录页，无需额外处理
      break
  }
}
</script>

<style scoped>
.users-manage-view {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.content {
  padding-top: 46px;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #999;
}

.van-nav-bar {
  font-size: 20px;
}

.van-icon {
  font-weight: 700;
  cursor: pointer;
}
</style>
