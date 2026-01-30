import { ref, computed, defineComponent, h } from 'vue'
import { showDialog, ActionSheet } from 'vant'
import { useAuthStore } from '@/stores/auth'
import UserModDialog from '@/components/UserModDialog.vue'
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
  const openMenu = () => (showActionSheet.value = true)
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
        } as MenuAction & { handler?: () => void })
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

  // 定义一个包装组件，将内部状态 showUserMod 绑定到 UserModDialog
  const UserDialog = defineComponent({
    setup() {
      return () =>
        h(UserModDialog, {
          modelValue: showUserMod.value,
          'onUpdate:modelValue': (v: boolean) => (showUserMod.value = v),
        })
    },
  })

  // 定义 ActionSheet 包装组件
  const AppMenu = defineComponent({
    setup() {
      return () =>
        h(ActionSheet, {
          show: showActionSheet.value,
          'onUpdate:show': (v: boolean) => (showActionSheet.value = v),
          actions: actions.value,
          cancelText: '取消',
          onSelect: onMenuSelect,
        })
    },
  })

  return {
    openMenu,
    AppMenu,
    UserDialog,
  }
}
