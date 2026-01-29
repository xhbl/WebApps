import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as usersApi from '@/api/users'
import type { User } from '@/types'
import { toast } from '@/utils/toast'
import { showDialog } from 'vant'

export const useUsersStore = defineStore('users', () => {
  // State
  const users = ref<User[]>([])

  // Actions
  /**
   * 加载用户列表
   */
  const loadUsers = async () => {
    try {
      const response = await usersApi.getUsers()
      if (response.data.success === 'true') {
        // PHP 现在返回空数组而不是 null
        users.value = Array.isArray(response.data.user) ? response.data.user : []
        return true
      }
      return false
    } catch (error) {
      console.error('Load users failed:', error)
      return false
    }
  }

  /**
   * 保存用户
   */
  const saveUser = async (user: User) => {
    try {
      const response = await usersApi.saveUser(user)
      if (response.data.success === 'true' && response.data.user && response.data.user[0]) {
        const savedUser = response.data.user[0]

        if (user._new === 1) {
          users.value.push(savedUser)
          toast.showSuccess('创建成功')
        } else {
          const index = users.value.findIndex((u) => u.Id === savedUser?.Id)
          if (index !== -1 && savedUser) {
            users.value[index] = savedUser
          }
          toast.showSuccess('更新成功')
        }

        return savedUser
      }
      return null
    } catch (error) {
      console.error('Save user failed:', error)
      return null
    }
  }

  /**
   * 删除用户
   * 单次确认：删除用户将级联删除其名下所有数据
   */
  const deleteUser = async (user: User) => {
    try {
      // 1. 等待确认弹窗
      // 注意：点击取消会抛出异常，所以这里会被 try-catch 捕获
      await showDialog({
        title: '删除用户',
        message: `确定要删除用户"${user.dispname || user.name}"吗？\n这将同时删除其所有相关联的数据。`,
        confirmButtonText: '删除',
        confirmButtonColor: 'var(--van-danger-color)',
        cancelButtonText: '取消',
        showCancelButton: true,
      })

      // 2. 执行真正的删除请求
      await usersApi.deleteUser(user)

      // 3. 更新本地状态（Store）
      const index = users.value.findIndex((u) => u.Id === user.Id)
      if (index !== -1) {
        users.value.splice(index, 1)
      }

      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      // 关键判断：如果是用户点击了取消，不应该报错，直接结束即可
      if (error === 'cancel') {
        return false
      }

      console.error('Delete user failed:', error)
      toast.showFail('删除失败，请稍后重试')
      return false
    }
  }

  return {
    users,
    loadUsers,
    saveUser,
    deleteUser,
  }
})
