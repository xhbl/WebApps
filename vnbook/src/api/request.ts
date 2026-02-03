import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from '@/utils/toast'
import type { ApiResponse } from '@/types'

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: './api',
  timeout: 20000,
  withCredentials: true, // 携带 Cookie
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 显示 loading（带 200ms 防抖）
    if (config.headers && !config.headers['X-No-Loading']) {
      toast.showLoading()
    }

    // 添加会话 ID
    const sessionId = localStorage.getItem('sessionId')
    if (sessionId && config.params) {
      config.params._sessid = sessionId
    } else if (sessionId) {
      config.params = { _sessid: sessionId }
    }

    return config
  },
  (error: AxiosError) => {
    toast.hideLoading()
    return Promise.reject(error)
  },
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    toast.hideLoading()

    const data = response.data as ApiResponse

    // 检查业务状态
    if (data.success === false) {
      const message = data.message || '操作失败'
      toast.showFail(message)
      return Promise.reject(new Error(message))
    }

    return response
  },
  (error: AxiosError) => {
    toast.hideLoading()

    let message = '网络错误，请稍后重试'

    if (error.response) {
      switch (error.response.status) {
        case 401:
          message = '未登录或会话已过期'
          // 清除会话信息
          localStorage.removeItem('sessionId')
          localStorage.removeItem('userInfo')
          // 跳转到登录页（使用相对路径，支持子目录部署）
          window.location.href = '#/login'
          break
        case 403:
          message = '没有权限'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器错误'
          break
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时'
    }

    toast.showFail(message)
    return Promise.reject(error)
  },
)

export default request
