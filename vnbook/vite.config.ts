import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import legacy from '@vitejs/plugin-legacy'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Vite 配置文件
 * ================================================
 * 用于配置 Vue 3 + TypeScript 项目的开发和生产构建
 */
export default defineConfig(() => {
  // 检测是否为 PWA 打包模式
  const isPwaBuild = process.env.VITE_BUILD_PWA === 'true'

  return {
    /**
     * 1. 基础路径配置
     * 如果是 PWA 打包模式，为了 Service Worker 稳定性使用固定的 '/vnb/'
     * 否则设置为 './' 使用相对路径，便于部署到子目录
     * 打包后的 HTML 引用资源会变成 ./assets/xxx.js
     * 支持 Hash 路由模式和 Apache 子目录部署
     */
    base: isPwaBuild ? '/vnb/' : './',

    /**
     * 2. 插件配置
     */
    plugins: [
      // Vue 3 支持
      vue(),
      // Vue DevTools 集成
      vueDevTools(),
      // 自动导入组件（Vant UI）
      Components({
        resolvers: [VantResolver({ importStyle: true })],
      }),
      // 旧版浏览器兼容性支持
      legacy({
        // 支持的浏览器版本列表
        targets: [
          'Chrome >= 51',
          'Edge >= 15',
          'Firefox >= 54',
          'Safari >= 10',
          'Opera >= 38',
          'iOS >= 10',
        ],
        // 生成 legacy 版本的入口脚本
        renderLegacyChunks: true,
        // 自动注入必要的 Polyfills（如 Promise.finally）
        modernPolyfills: true,
      }),
      // PWA 离线支持配置 (仅在 PWA 打包时激活)
      VitePWA({
        disable: !isPwaBuild,
        registerType: 'autoUpdate',
        manifest: {
          name: '单词本',
          short_name: '单词本',
          description: '单词记录本(VNBook) 网页应用程序',
          theme_color: '#f7f8fa',
          background_color: '#f7f8fa',
          display: 'standalone',
          icons: [
            {
              src: 'resources/icons/favicon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'resources/icons/vnb-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'resources/icons/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        },
      }),
    ],

    /**
     * 3. 路径别名配置
     * 允许在代码中使用 @/xxx 来引用 src 文件夹中的文件
     */
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    /**
     * 4. 开发服务器配置
     */
    server: {
      // 监听所有网络接口，方便局域网和手机调试
      host: '0.0.0.0',
      /**
       * API 代理配置
       * 开发时将 /api 请求代理到 PHP 容器
       * 生产时前后端同域，无需代理
       */
      proxy: {
        '/api': {
          // 目标地址（PHP 容器）
          target: 'http://localhost:8080',
          changeOrigin: true,
          // 重写路径：将 /api/xxx 改为 /xxx
          // 因为 Docker 映射是 ./public/api:/var/www/html
          // 所以需要移除 /api 前缀才能正确访问到 index.php
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
