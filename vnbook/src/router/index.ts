import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 计算路径深度（简单根据斜杠分割）
const getPathDepth = (path: string): number => {
  return path.split('/').filter(Boolean).length
}

// 导出系统后退状态，供 App.vue 使用
export const isSystemBack = ref(false)

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/books',
    name: 'BooksList',
    component: () => import('@/views/BooksListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/books/:bid/words',
    name: 'WordsList',
    component: () => import('@/views/WordsListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/books/:bid/words/:wid',
    name: 'WordCard',
    component: () => import('@/views/WordCardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'UsersManage',
    component: () => import('@/views/UsersManageView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/',
    name: 'Root',
    redirect: { name: 'Login' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 如果路由元信息要求禁用滚动恢复，则返回空
    if (to.meta?.noScrollRestore || from.meta?.noScrollRestore) {
      return { left: 0, top: 0 }
    }

    // 如果有保存的位置（浏览器前进/后退），恢复该位置
    if (savedPosition) {
      // 使用 requestAnimationFrame 确保在下一帧恢复，避免与动画冲突
      // 添加 behavior: 'instant' 确保立即滚动，减少视觉抖动
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve({ ...savedPosition, behavior: 'instant' })
        })
      })
    }

    // 对于非 KeepAlive 组件，使用默认逻辑
    // 对于同一路由的不同路由参数（如 /books/1/words → /books/2/words），视为新页面，滚动到顶部
    // 查询参数变化（如 ?select=true）保持当前位置
    if (to.path === from.path) {
      // 比较路由参数是否变化
      const paramsChanged = JSON.stringify(to.params) !== JSON.stringify(from.params)
      if (paramsChanged) {
        // 路由参数变化（如切换单词本），滚动到顶部
        return { left: 0, top: 0, behavior: 'auto' }
      } else {
        // 只有查询参数变化，保持当前位置
        return false
      }
    }

    // 默认滚动到顶部
    return { left: 0, top: 0, behavior: 'smooth' }
  },
})

// 关键：禁用浏览器原生的滚动恢复，防止与手动控制冲突，解决视口变化导致的页面错乱
if (window.history && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面切换动画方向（基于路由深度变化）
  if (from) {
    const fromDepth = getPathDepth(from.path)
    const toDepth = getPathDepth(to.path)

    if (!to.meta) {
      to.meta = {}
    }

    if (toDepth > fromDepth) {
      // 前进：新页面从右侧滑入
      to.meta.transition = 'slide-left'
    } else if (toDepth < fromDepth) {
      // 后退：新页面从左侧滑入
      to.meta.transition = 'slide-right'
    } else {
      // 深度相同，使用默认动画或无动画
      to.meta.transition = 'slide'
    }
  }

  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    if (!authStore.isLoggedIn) {
      // 尝试自动登录
      const success = await authStore.checkLogin()
      if (!success) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }

    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next({ name: 'BooksList' })
      return
    }
  }

  // 已登录用户访问登录页，重定向回主页
  // 注意：退出登录(Logout)时，必须先 await authStore.logout() 确保 isLoggedIn 为 false
  // 否则跳转到 Login 会被此逻辑拦截并弹回
  if (to.name === 'Login' && authStore.isLoggedIn) {
    next(authStore.homeRoute)
    return
  }

  next()
})

export default router
