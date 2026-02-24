import request from './request'
import type { User, ApiResponse } from '@/types'

export interface UserStats {
  bookCount: number
  wordCount: number
  lastActive: string
}

/**
 * 获取用户列表（仅 admin）
 */
export const getUsers = () => {
  return request.get<ApiResponse>('/users.php')
}

/**
 * 获取用户统计信息（仅 admin）
 */
export const getUserStats = (uid: number) => {
  return request.get<ApiResponse<UserStats>>('/users.php', { params: { stats: uid } })
}

/**
 * 创建或更新用户（仅 admin）
 */
export const saveUser = (user: User) => {
  return request.put<ApiResponse>('/users.php', user)
}

/**
 * 删除用户（仅 admin）
 */
export const deleteUser = (user: User) => {
  return request.delete<ApiResponse>('/users.php', {
    data: user,
  })
}

/**
 * 清空用户数据（仅 admin）
 * 删除用户的所有单词本和单词，但保留账号
 */
export const clearUserData = (uid: number) => {
  return request.post<ApiResponse>('/users.php', null, {
    params: { action: 'clear', uid },
  })
}
