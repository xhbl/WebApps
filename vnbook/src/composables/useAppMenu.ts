import { ref, computed, defineComponent, h, unref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { ActionSheet } from 'vant'
import { showGlobalDialog } from '@/composables/useGlobalDialog'
import { useAuthStore } from '@/stores/auth'
import UserModDialog from '@/components/UserModDialog.vue'
import { toast } from '@/utils/toast'
import type { MenuAction } from '@/types'
import { usePopupHistory } from '@/composables/usePopupHistory'

export interface AppMenuItem {
  name: string
  icon?: string
  color?: string
  key?: string
  disabled?: boolean
  handler?: () => void
}

export interface UseAppMenuOptions {
  items?: AppMenuItem[] | Ref<AppMenuItem[]>
  showUser?: boolean
  userIcon?: string
  showLogout?: boolean
  logoutIcon?: string
}

export function useAppMenu(options: UseAppMenuOptions = {}) {
  const router = useRouter()
  const authStore = useAuthStore()
  const showActionSheet = ref(false)
  const openMenu = () => (showActionSheet.value = true)
  const { close } = usePopupHistory(showActionSheet)
  const showUserMod = ref(false)

  const actions = computed<MenuAction[]>(() => {
    const list: MenuAction[] = []
    const items = unref(options.items)

    // 1. 自定义项
    if (items) {
      items.forEach((item) => {
        list.push({
          name: item.name,
          icon: item.icon,
          color: item.color,
          disabled: item.disabled,
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
        color: 'var(--van-primary-color)',
      })
    }

    return list
  })

  const onMenuSelect = async (action: MenuAction & { handler?: () => void }) => {
    // 使用封装的 close 方法，自动处理历史记录回退等待
    await close()

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
        try {
          await showGlobalDialog({
            title: userName,
            message: '确定要退出登录吗？',
            confirmButtonText: '退出',
            showCancelButton: true,
          })
          await onLogoutConfirm()
        } catch {
          // Cancelled
        }
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

  const onLogoutConfirm = async () => {
    toast.showLoading('')
    try {
      await authStore.logout()
      toast.showSuccess('已退出登录')
    } catch (e) {
      console.error(e)
      toast.hideLoading()
    } finally {
      // 退出后跳转登录页
      router.replace({ name: 'Login' })
    }
  }

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
          closeOnPopstate: false, // 禁用 Vant 自带的历史记录处理，避免与 usePopupHistory 冲突
        })
    },
  })

  return {
    openMenu,
    AppMenu,
    UserDialog,
  }
}
