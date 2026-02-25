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
