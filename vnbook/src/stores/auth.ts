import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import type { LoginInfo, LoginRequest } from '@/types'
import { toast } from '@/utils/toast'

export const useAuthStore = defineStore('auth', () => {
  // State
  const userInfo = ref<LoginInfo | null>(null)
  const sessionId = ref<string>('')

  // Init from localStorage
  const storedUser = localStorage.getItem('userInfo')
  if (storedUser) {
    try {
      userInfo.value = JSON.parse(storedUser)
    } catch (e) {
      console.error('Failed to parse stored user info', e)
    }
  }
  const storedSession = localStorage.getItem('sessionId')
  if (storedSession) {
    sessionId.value = storedSession
  }

  // Getters
  const isLoggedIn = computed(() => !!userInfo.value && !!sessionId.value)
  const isAdmin = computed(() => userInfo.value?.uname === 'admin')
  const userDisplayName = computed(() => {
    return userInfo.value?.dname?.trim() || userInfo.value?.uname || ''
  })

  // Actions
  /**
   * 登录
   */
  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data)
      const loginData = response.data

      if (loginData.success === 'true' && loginData.login) {
        userInfo.value = loginData.login
        sessionId.value = loginData.login.sid

        // 保存到 localStorage
        localStorage.setItem('sessionId', loginData.login.sid)
        localStorage.setItem('userInfo', JSON.stringify(loginData.login))

        // 登录成功后会跳转，不显示 toast
        return true
      }

      // 登录失败但未抛出异常（request拦截器已处理错误提示）
      return false
    } catch (error) {
      // 错误已在request拦截器中显示，这里只记录日志
      console.error('Login failed:', error)
      return false
    }
  }

  /**
   * 检查登录状态（自动登录）
   */
  const checkLogin = async () => {
    try {
      const sid = localStorage.getItem('sessionId')
      if (!sid) {
        return false
      }

      sessionId.value = sid
      const response = await authApi.checkLogin()
      const loginData = response.data

      if (loginData.success === 'true' && loginData.login) {
        userInfo.value = loginData.login
        localStorage.setItem('userInfo', JSON.stringify(loginData.login))
        return true
      } else {
        // 会话失效，清除本地数据
        clearAuth()
        return false
      }
    } catch (error) {
      console.error('Check login failed:', error)
      clearAuth()
      return false
    }
  }

  /**
   * 注销
   */
  const logout = async () => {
    try {
      await authApi.logout()
      toast.showSuccess('已退出登录')
      // 延迟跳转，确保 Toast 显示后再跳转
      setTimeout(() => {
        clearAuth(false) // 仅清除存储，保留内存状态防止 UI 闪烁
        window.location.href = '/login'
      }, 300)
      return true
    } catch (error) {
      console.error('Logout failed:', error)
      clearAuth(false)
      // 即使出错也要跳转到登录页
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      return false
    }
  }

  /**
   * 清除认证信息
   * @param clearState 是否同时清除内存中的状态（默认为 true）。
   * 在页面即将跳转销毁时设为 false 可避免 UI 闪烁。
   */
  const clearAuth = (clearState = true) => {
    if (clearState) {
      userInfo.value = null
      sessionId.value = ''
    }
    localStorage.removeItem('sessionId')
    localStorage.removeItem('userInfo')
  }

  /**
   * 修改用户信息
   */
  const updateUserInfo = async (data: {
    oldpass?: string
    newpass?: string
    newpass2?: string
    dispname?: string
  }) => {
    try {
      await authApi.updateUserInfo(data)

      // 更新显示名
      if (data.dispname !== undefined && userInfo.value) {
        userInfo.value.dname = data.dispname
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
      }

      toast.showSuccess('更新成功')
      return true
    } catch (error) {
      console.error('Update user info failed:', error)
      toast.showFail('更新失败')
      return false
    }
  }

  /**
   * 更新用户配置 (cfg)
   */
  const updateUserConfig = async (configPart: Record<string, unknown>) => {
    if (!userInfo.value) return false

    const newCfg = { ...(userInfo.value.cfg || {}), ...configPart }

    try {
      await authApi.updateUserInfo({ cfg: newCfg })

      // 更新本地状态
      userInfo.value.cfg = newCfg
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
      return true
    } catch (error) {
      console.error('Update config failed:', error)
      return false
    }
  }

  return {
    userInfo,
    sessionId,
    isLoggedIn,
    isAdmin,
    userDisplayName,
    login,
    checkLogin,
    logout,
    updateUserInfo,
    updateUserConfig,
  }
})
