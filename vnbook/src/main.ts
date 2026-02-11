import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vant/lib/index.css'
import '@/styles/global.css'

import App from './App.vue'
import router from './router'

import { showGlobalDialog } from '@/composables/useGlobalDialog'
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

/**
 * PWA Service Worker 注册逻辑
 * 仅在生产环境 (PROD) 时执行
 */
if (import.meta.env.PROD && import.meta.env.VITE_BUILD_PWA === 'true') {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('检测到新内容，应用已准备好更新')
      showGlobalDialog({
        title: '发现新版本',
        message: '应用有新内容可用，是否立即刷新以加载最新版本？',
        confirmButtonText: '立即刷新',
        cancelButtonText: '稍后再说',
      })
        .then(() => {
          updateSW(true)
        })
        .catch(() => {
          console.log('用户暂不更新')
        })
    },
    onOfflineReady() {
      console.log('应用已缓存，现在可以离线使用')
    },
  })
}
