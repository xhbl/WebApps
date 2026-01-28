import request from './request'
import type { User, ApiResponse } from '@/types'

/**
 * 获取用户列表（仅 admin）
 */
export const getUsers = () => {
  return request.get<ApiResponse>('/users.php')
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
