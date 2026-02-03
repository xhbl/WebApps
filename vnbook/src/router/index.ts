import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

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
