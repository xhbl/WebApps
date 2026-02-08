import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as usersApi from '@/api/users'
import type { User } from '@/types'
import { toast } from '@/utils/toast'

export const useUsersStore = defineStore('users', () => {
  // State
  const users = ref<User[]>([])

  // Actions
  /** 加载用户列表 */
  const loadUsers = async () => {
    try {
      const response = await usersApi.getUsers()
      if (response.data.success === true) {
        const rawUsers = Array.isArray(response.data.user) ? response.data.user : []
        users.value = rawUsers.map((u: User) => ({
          ...u,
          id: Number(u.id),
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Load users failed:', error)
      return false
    }
  }

  /** 保存用户 */
  const saveUser = async (user: User) => {
    try {
      const response = await usersApi.saveUser(user)
      if (!response.data.success) {
        throw new Error(response.data.message || '保存失败')
      }
      if (response.data.success === true && response.data.user && response.data.user[0]) {
        const savedUser = response.data.user[0]
        savedUser.id = Number(savedUser.id) // 确保 ID 为数字

        if (user._new === 1) {
          if (!users.value.some((u) => u.id === savedUser.id)) {
            users.value.push(savedUser)
            toast.showSuccess('创建成功')
          }
        } else {
          const index = users.value.findIndex((u) => u.id === savedUser.id)
          if (index !== -1 && savedUser) {
            users.value.splice(index, 1, savedUser)
          }
          toast.showSuccess('更新成功')
        }
        return savedUser
      }
      return null
    } catch (error) {
      console.error('Save user failed:', error)
      toast.showFail('保存失败')
      return null
    }
  }

  /** 删除用户（仅数据处理，弹窗交互由 View 层负责） */
  const deleteUser = async (user: User) => {
    try {
      const response = await usersApi.deleteUser(user)
      if (!response.data.success) {
        throw new Error(response.data.message || '删除失败')
      }
      const index = users.value.findIndex((u) => u.id === user.id)
      if (index !== -1) {
        users.value.splice(index, 1)
      }
      toast.showSuccess('删除成功')
      return true
    } catch (error) {
      console.error('Delete user failed:', error)
      toast.showFail('删除失败')
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
