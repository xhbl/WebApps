import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
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
    redirect: () => {
      // 这里不要直接用 authStore，因为可能还没初始化
      // 路由守卫会处理重定向
      return '/books'
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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

  // 已登录用户访问登录页，重定向
  if (to.name === 'Login' && authStore.isLoggedIn) {
    if (authStore.isAdmin) {
      next({ name: 'UsersManage' })
    } else {
      next({ name: 'BooksList' })
    }
    return
  }

  // 根路径重定向：管理员去用户管理，普通用户去单词本
  if (to.name === 'Root' && authStore.isLoggedIn) {
    if (authStore.isAdmin) {
      next({ name: 'UsersManage' })
    } else {
      next({ name: 'BooksList' })
    }
    return
  }

  next()
})

export default router
