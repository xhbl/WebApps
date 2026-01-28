import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as usersApi from '@/api/users'
import type { User } from '@/types'
import { showSuccessToast, showDialog } from 'vant'

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
          showSuccessToast('创建成功')
        } else {
          const index = users.value.findIndex((u) => u.Id === savedUser?.Id)
          if (index !== -1 && savedUser) {
            users.value[index] = savedUser
          }
          showSuccessToast('更新成功')
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
   * 两阶段确认：1) 确认删除用户 2) 确认是否同时删除用户数据库
   */
  const deleteUser = async (user: User) => {
    try {
      // 第一次确认：删除用户
      await showDialog({
        title: '删除用户',
        message: `确定要删除用户"${user.dispname}"吗？`,
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })

      // 第二次确认：删除数据库
      const deleteDb = await showDialog({
        title: '删除用户数据库',
        message: '该用户的数据需要同时删除吗？',
        confirmButtonText: '删除数据库',
        cancelButtonText: '仅删除用户',
      })
        .then(() => true)
        .catch(() => false)

      // 设置 _new 标志：11 = 删除用户和数据库, 0 = 仅删除用户
      const deletePayload = { ...user, _new: deleteDb ? 11 : 0 }

      await usersApi.deleteUser(deletePayload)

      const index = users.value.findIndex((u) => u.Id === user.Id)
      if (index !== -1) {
        users.value.splice(index, 1)
      }

      showSuccessToast('删除成功')
      return true
    } catch (error) {
      console.error('Delete user failed:', error)
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
