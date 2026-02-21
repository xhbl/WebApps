import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 系统后退检测：禁用动画以避免手势冲突
let isSystemBackNavigation = false
let isProgrammaticBack = false

window.addEventListener('popstate', () => {
  // 如果是编程式后退，忽略
  if (isProgrammaticBack) {
    isProgrammaticBack = false
    return
  }
  isSystemBackNavigation = true
  // 后备清理，防止标志永久残留
  setTimeout(() => { isSystemBackNavigation = false }, 1000)
})

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
})

// 关键：禁用浏览器原生的滚动恢复，防止与手动控制冲突，解决视口变化导致的页面错乱
if (window.history && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// 猴子补丁 router.back 以标记编程式后退
const originalBack = router.back
router.back = function(...args) {
  isProgrammaticBack = true
  // 安全清除，防止标志残留
  setTimeout(() => { isProgrammaticBack = false }, 100)
  return originalBack.apply(this, args)
}

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 系统后退检测：禁用动画以避免手势冲突
  if (isSystemBackNavigation) {
    if (!to.meta) {
      to.meta = {}
    }
    to.meta.disableTransition = true
    // 调试日志，仅在开发环境输出
    if (import.meta.env.DEV) {
      console.log('[System Back] Disable transition for:', to.name || to.path)
    }
    // 消费标志，确保只影响当前导航
    isSystemBackNavigation = false
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
