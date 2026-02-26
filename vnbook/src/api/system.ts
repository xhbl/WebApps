import request from './request'
import type { ApiResponse } from '@/types'

export interface SystemInfo {
  serverSoftware: string
  phpVersion: string
  vnbDbName: string
  dbVersion: string
  baseDbName: string
  baseWordCount: number
  baseDefCount: number
  userCount: number
}

export interface ImportStats {
  users: number
  books: number
  words: number
  explanations: number
  sentences: number
  mappings: number
  reviews: number
}

export interface ImportResponse {
  success: boolean
  message: string
  stats?: ImportStats
}

/**
 * 获取系统信息（仅 admin）
 */
export const getSystemInfo = () => {
  return request.get<ApiResponse<SystemInfo>>('/system.php', {
    params: { action: 'info' },
  })
}

/**
 * 清空重置所有用户数据（仅 admin）
 */
export const resetAllUserData = () => {
  return request.post<ApiResponse>('/system.php', null, {
    params: { action: 'reset' },
  })
}

/**
 * 检查数据库是否为空（只有admin用户）
 */
export const checkDatabaseEmpty = () => {
  return request.get<ApiResponse<{ isEmpty: boolean }>>('/system.php', {
    params: { action: 'checkEmpty' },
  })
}

/**
 * 导出所有用户数据
 * 使用 Blob 下载方式，支持自定义文件名，PWA 体验更好
 */
export const exportData = async () => {
  const sessid = localStorage.getItem('sessid')
  const baseUrl = import.meta.env.BASE_URL
  const url = `${baseUrl}api/system.php?action=export&_sessid=${encodeURIComponent(sessid || '')}`

  // 使用 fetch 获取文件 Blob
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/octet-stream',
    },
  })

  if (!response.ok) {
    throw new Error('导出失败')
  }

  // 从响应头获取文件名，如果没有则使用默认格式
  const contentDisposition = response.headers.get('content-disposition')
  let filename = 'vnbook_export.vnb'
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/)
    if (match && match[1]) {
      filename = match[1]
    }
  }

  // 获取 Blob 并创建下载链接
  const blob = await response.blob()
  const downloadUrl = URL.createObjectURL(blob)

  // 创建临时下载链接并点击
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()

  // 清理
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
  }, 100)
}

/**
 * 导入用户数据
 * @param file 上传的文件
 */
export const importData = async (file: File): Promise<ImportResponse> => {
  const sessid = localStorage.getItem('sessid')
  const formData = new FormData()
  formData.append('file', file)
  
  const baseUrl = import.meta.env.BASE_URL
  const url = `${baseUrl}api/system.php?action=import&_sessid=${encodeURIComponent(sessid || '')}`
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })
  
  return response.json()
}
