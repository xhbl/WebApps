import { ref } from 'vue'
import { showConfirmDialog } from 'vant'
import { useUsersStore } from '@/stores/users'
import { showPromptDialog, showGlobalDialog } from '@/composables/useGlobalDialog'
import { verifyAdminPassword } from '@/api/auth'
import { clearUserData } from '@/api/users'
import { resetAllUserData, checkDatabaseEmpty, exportData, importData } from '@/api/system'
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
      message: `确定要删除用户"${userName}"及其数据吗？<br><br><span style="color:var(--van-danger-color)"><b>此操作将删除该用户账号及其所有相关数据，且无法撤销。</b></span>`,
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

  // --- 清空重置所有用户数据（带管理员密码验证） ---
  const handleResetAllUserData = async () => {
    const validPassword = await verifyWithPassword({
      title: '清空重置',
      message: `确定要清空所有用户数据吗？<br><br><span style="color:var(--van-danger-color)"><b>此操作将删除所有用户账号和数据并将重置为初始状态，且无法撤销。</b></span>`,
      confirmButtonText: '确认重置',
      confirmButtonColor: 'var(--van-danger-color)',
    })
    if (!validPassword) return false

    const response = await resetAllUserData()
    if (response.data.success) {
      toast.showSuccess('重置成功')
      return true
    } else {
      toast.showFail(response.data.message || '重置失败')
      return false
    }
  }

  // --- 导出所有用户数据 ---
  const handleExportUserData = async () => {
    try {
      // 先检查数据库是否为空
      toast.showLoading('检查数据库...')
      const checkResponse = await checkDatabaseEmpty()
      toast.hideLoading()

      if (!checkResponse.data.success) {
        toast.showFail('检查数据库状态失败')
        return
      }

      if (checkResponse.data.data?.isEmpty) {
        toast.show('数据库为空，没有可导出的用户数据')
        return
      }

      await showConfirmDialog({
        title: '导出数据',
        message: '确定要导出所有用户数据吗？\n导出数据将保存到 .vnb 文件，可用于备份迁移和导入。',
        confirmButtonText: '导出',
        confirmButtonColor: 'var(--van-primary-color)',
      })

      toast.showLoading('正在导出...')

      await exportData()

      toast.hideLoading()
      toast.show('已导出到文件')
    } catch {
      // 用户取消
    }
  }

  // --- 导入用户数据 ---
  const handleImportUserData = async () => {
    try {
      // 先检查数据库是否为空
      toast.showLoading('检查数据库状态...')

      const checkResponse = await checkDatabaseEmpty()
      toast.hideLoading()

      if (!checkResponse.data.success) {
        toast.showFail('检查数据库状态失败')
        return false
      }

      if (!checkResponse.data.data?.isEmpty) {
        toast.show('数据库已经包含用户数据，无法导入。请先执行清空重置后重试。')
        return false
      }

      // 数据库为空，允许选择文件导入
      await showConfirmDialog({
        title: '导入数据',
        message: '确定执行用户数据导入吗？\n请选择导出的 .vnb 文件进行导入。',
        confirmButtonText: '选择文件',
        confirmButtonColor: 'var(--van-primary-color)',
      })

      // 创建隐藏的文件输入
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.vnb,.json'

      return new Promise((resolve) => {
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (!file) {
            resolve(false)
            return
          }

          toast.showLoading('正在导入...')

          try {
            const result = await importData(file)
            toast.hideLoading()

            if (result.success) {
              const stats = result.stats
              const msg = stats
                ? `<div style="background-color: var(--van-background-2); border-radius: 6px; padding: 10px 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: var(--van-text-color);">用户</span>
                      <span style="color: var(--van-text-color-2);">${stats.users}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: var(--van-text-color);">单词本</span>
                      <span style="color: var(--van-text-color-2);">${stats.books}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: var(--van-text-color);">单词</span>
                      <span style="color: var(--van-text-color-2);">${stats.words}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: var(--van-text-color);">释义</span>
                      <span style="color: var(--van-text-color-2);">${stats.explanations}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; grid-column: span 2;">
                      <span style="color: var(--van-text-color);">例句</span>
                      <span style="color: var(--van-text-color-2);">${stats.sentences}</span>
                    </div>
                  </div>`
                : result.message

              // 使用全局对话框显示导入结果（无按钮，点击关闭）
              showGlobalDialog({
                title: '✓ 导入成功',
                message: msg,
                showConfirmButton: false, // 不显示确认按钮
                closeOnClickOverlay: true, // 点击遮罩关闭
                allowHtml: true,
                messageAlign: 'left',
              })

              resolve(true)
            } else {
              toast.showFail(result.message || '导入失败')
              resolve(false)
            }
          } catch (error) {
            toast.hideLoading()
            toast.showFail('导入失败，请检查文件格式')
            console.error('Import error:', error)
            resolve(false)
          }
        }

        input.click()
      })
    } catch {
      // 用户取消
      toast.hideLoading()
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
    handleResetAllUserData,
    handleExportUserData,
    handleImportUserData,
  }
}
