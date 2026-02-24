import { ref } from 'vue'
import { useUsersStore } from '@/stores/users'
import { showPromptDialog } from '@/composables/useGlobalDialog'
import { verifyAdminPassword } from '@/api/auth'
import { clearUserData } from '@/api/users'
import { toast } from '@/utils/toast'
import type { User } from '@/types'

interface PromptOptions {
  title: string
  message: string
  confirmButtonText: string
  confirmButtonColor: string
}

export function useUserOperations() {
  const usersStore = useUsersStore()

  // --- 编辑/添加功能逻辑 ---
  const showEditor = ref(false)
  const editorUser = ref<User | null>(null)

  const openNewUser = () => {
    editorUser.value = { id: 0, name: '', dispname: '', time_c: '', _new: 1 }
    showEditor.value = true
  }

  const openEditUser = (user: User) => {
    editorUser.value = { ...user, _new: 0 }
    showEditor.value = true
  }

  // --- 通用的管理员密码验证 ---
  const verifyWithPassword = async (options: PromptOptions): Promise<string | null> => {
    try {
      const password = await showPromptDialog({
        title: options.title,
        message: options.message,
        inputPlaceholder: '请输入管理员密码',
        inputType: 'password',
        confirmButtonText: options.confirmButtonText,
        confirmButtonColor: options.confirmButtonColor,
        showCancelButton: true,
        allowHtml: true,
      })

      toast.showLoading('验证中...')
      const valid = await verifyAdminPassword(password)
      toast.hideLoading()

      if (!valid) {
        toast.showFail('密码错误')
        return null
      }
      return password
    } catch {
      toast.hideLoading()
      return null
    }
  }

  // --- 删除功能逻辑（内部函数） ---
  const deleteUserInternal = async (user: User) => {
    try {
      await usersStore.deleteUser(user)
      // 如果正在编辑该用户，关闭编辑器
      if (editorUser.value?.id === user.id) {
        editorUser.value = null
        showEditor.value = false
      }
      return true
    } catch {
      return false
    }
  }

  // --- 删除功能逻辑（带管理员密码验证） ---
  const handleDeleteUserWithVerify = async (user: User) => {
    const userName = user.dispname?.trim() || user.name
    const validPassword = await verifyWithPassword({
      title: '删除用户',
      message: `确定要删除用户"${userName}"及其数据吗？<br><br><span style="color:var(--van-danger-color)"><b>此操作将删除该用户账号的其所有相关数据，且无法撤销。</b></span>`,
      confirmButtonText: '确认删除',
      confirmButtonColor: 'var(--van-danger-color)',
    })
    if (!validPassword) return false
    return await deleteUserInternal(user)
  }

  // --- 清空用户数据逻辑（带管理员密码验证） ---
  const handleClearUserData = async (user: User) => {
    const userName = user.dispname?.trim() || user.name
    const validPassword = await verifyWithPassword({
      title: '清空数据',
      message: `确定要清空用户"${userName}"的数据吗？<br><br><span style="color:var(--van-warning-color)"><b>此操作将删除该用户的所有数据，且无法撤销。</b></span>`,
      confirmButtonText: '确认清空',
      confirmButtonColor: 'var(--van-warning-color)',
    })
    if (!validPassword) return false

    const response = await clearUserData(user.id)
    if (response.data.success) {
      toast.showSuccess('数据已清空')
      return true
    } else {
      toast.showFail(response.data.message || '清空失败')
      return false
    }
  }

  return {
    showEditor,
    editorUser,
    openNewUser,
    openEditUser,
    handleDeleteUserWithVerify,
    handleClearUserData,
  }
}
