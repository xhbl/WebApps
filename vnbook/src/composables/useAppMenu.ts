import { ref, computed } from 'vue'
import { showDialog } from 'vant'
import { useAuthStore } from '@/stores/auth'
import type { MenuAction } from '@/types'

export interface AppMenuItem {
  name: string
  icon?: string
  color?: string
  key?: string
  handler?: () => void
}

export interface UseAppMenuOptions {
  items?: AppMenuItem[]
  showUser?: boolean
  userIcon?: string
  showLogout?: boolean
  logoutIcon?: string
}

export function useAppMenu(options: UseAppMenuOptions = {}) {
  const authStore = useAuthStore()
  const showActionSheet = ref(false)
  const showUserMod = ref(false)

  const actions = computed<MenuAction[]>(() => {
    const list: MenuAction[] = []

    // 1. 自定义项
    if (options.items) {
      options.items.forEach((item) => {
        list.push({
          name: item.name,
          icon: item.icon,
          color: item.color,
          key: item.key || item.name,
          handler: item.handler,
        } as MenuAction)
      })
    }

    // 2. 用户项 (默认显示)
    if (options.showUser !== false) {
      list.push({
        name: authStore.userDisplayName || '用户',
        key: 'mod',
        icon: options.userIcon || 'user-circle-o',
      })
    }

    // 3. 退出登录 (默认显示)
    if (options.showLogout !== false) {
      list.push({
        name: '退出登录',
        key: 'logout',
        icon: options.logoutIcon || 'close',
        color: 'var(--van-warning-color)',
      })
    }

    return list
  })

  const onMenuSelect = (action: MenuAction & { handler?: () => void }) => {
    showActionSheet.value = false

    // 优先处理自定义 handler
    if (action.handler) {
      action.handler()
      return
    }

    switch (action.key) {
      case 'mod':
        showUserMod.value = true
        break
      case 'logout':
        const userName = authStore.userDisplayName || '请确认'
        showDialog({
          title: userName,
          message: '确定要退出登录吗？',
          confirmButtonText: '退出',
          cancelButtonText: '取消',
          showCancelButton: true,
        })
          .then(async () => {
            await authStore.logout()
          })
          .catch(() => {})
        break
    }
  }

  return {
    actions,
    onMenuSelect,
    showActionSheet,
    showUserMod,
  }
}
