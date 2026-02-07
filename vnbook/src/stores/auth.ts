import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import type { LoginInfo, LoginRequest } from '@/types'
import { toast } from '@/utils/toast'

export const useAuthStore = defineStore('auth', () => {
  // State
  const userInfo = ref<LoginInfo | null>(null)
  const sessionId = ref<string>('')

  // Init from localStorage or sessionStorage
  const initFromStorage = () => {
    // 优先尝试 localStorage (持久化会话)
    let u = localStorage.getItem('userInfo')
    let s = localStorage.getItem('sessionId')

    // 如果没有，尝试 sessionStorage (临时会话)
    if (!u || !s) {
      u = sessionStorage.getItem('userInfo')
      s = sessionStorage.getItem('sessionId')
    }

    if (u && s) {
      try {
        userInfo.value = JSON.parse(u)
        sessionId.value = s
      } catch (e) {
        console.error('Failed to parse stored user info', e)
      }
    }
  }

  initFromStorage()

  // Getters
  const isLoggedIn = computed(() => !!userInfo.value && !!sessionId.value)
  const isAdmin = computed(() => userInfo.value?.uname === 'admin')
  const userDisplayName = computed(() => {
    return userInfo.value?.dname?.trim() || userInfo.value?.uname || ''
  })
  /**
   * 获取当前用户的默认主页路由
   */
  const homeRoute = computed(() => {
    if (isAdmin.value) return { name: 'UsersManage' }
    return { name: 'BooksList' }
  })

  // Actions
  /**
   * 登录
   */
  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data)
      const loginData = response.data

      if (loginData.success === true && loginData.login) {
        userInfo.value = loginData.login
        sessionId.value = loginData.login.sid

        // 根据 remember 选项决定存储位置
        const storage = data.remember ? localStorage : sessionStorage
        const otherStorage = data.remember ? sessionStorage : localStorage

        storage.setItem('sessionId', loginData.login.sid)
        storage.setItem('userInfo', JSON.stringify(loginData.login))

        // 清除另一个存储，防止状态混淆
        otherStorage.removeItem('sessionId')
        otherStorage.removeItem('userInfo')

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
      // 优先使用 state 中的 sid，如果没有则尝试从任一存储中获取
      const sid =
        sessionId.value || localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')

      if (!sid) {
        return false
      }

      sessionId.value = sid
      const response = await authApi.checkLogin()
      const loginData = response.data

      if (loginData.success === true && loginData.login) {
        userInfo.value = loginData.login
        updateStoredUserInfo(userInfo.value)
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
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // 无论 API 是否成功，都必须彻底清除本地和内存中的认证状态
      // 这样 isLoggedIn 才会变为 false，路由守卫才会放行
      clearAuth(true)
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
    sessionStorage.removeItem('sessionId')
    sessionStorage.removeItem('userInfo')
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
      const response = await authApi.updateUserInfo(data)
      if (!response.data.success) {
        throw new Error(response.data.message || '更新失败')
      }

      if (response.data.login) {
        userInfo.value = response.data.login
        sessionId.value = response.data.login.sid
        updateStoredUserInfo(userInfo.value)
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
      const response = await authApi.updateUserInfo({ cfg: newCfg })
      if (!response.data.success) {
        throw new Error(response.data.message || '更新配置失败')
      }

      if (response.data.login) {
        userInfo.value = response.data.login
        sessionId.value = response.data.login.sid
        updateStoredUserInfo(userInfo.value)
      } else {
        // Fallback: 仅更新本地 cfg
        userInfo.value.cfg = newCfg
        updateStoredUserInfo(userInfo.value)
      }
      return true
    } catch (error) {
      console.error('Update config failed:', error)
      return false
    }
  }

  // 辅助函数：更新当前使用的存储中的用户信息
  const updateStoredUserInfo = (info: LoginInfo) => {
    const json = JSON.stringify(info)
    if (localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', info.sid) // 确保 SID 同步更新
      localStorage.setItem('userInfo', json)
    }
    if (sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', info.sid) // 确保 SID 同步更新
      sessionStorage.setItem('userInfo', json)
    }
  }

  return {
    userInfo,
    sessionId,
    isLoggedIn,
    isAdmin,
    userDisplayName,
    homeRoute,
    login,
    checkLogin,
    logout,
    updateUserInfo,
    updateUserConfig,
  }
})
