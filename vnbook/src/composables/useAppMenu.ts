import { ref, computed, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, ActionSheet } from 'vant'
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
  const router = useRouter()
  const authStore = useAuthStore()
  const showActionSheet = ref(false)
  const openMenu = () => (showActionSheet.value = true)
  usePopupHistory(showActionSheet)
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
        color: 'var(--van-primary-color)',
      })
    }

    return list
  })

  const onMenuSelect = (action: MenuAction & { handler?: () => void }) => {
    showActionSheet.value = false

    // 延迟执行后续操作，等待 ActionSheet 关闭触发的 history.back() 完成
    // 防止 history 操作冲突（Pop State 尚未完成就尝试 Push State 或导航）
    setTimeout(() => {
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
              toast.showLoading('') // 仅显示转圈动画，视觉上更轻量
              try {
                await authStore.logout()
                toast.showSuccess('已退出登录')
              } catch (e) {
                console.error(e)
                toast.hideLoading()
              } finally {
                // 退出后跳转登录页。不带 redirect 参数，以便切换用户后默认进入主页
                router.replace({ name: 'Login' })
              }
            })
            .catch(() => {})
          break
      }
    }, 100)
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
