import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    Components({
      resolvers: [VantResolver({ importStyle: true })],
    }),
    legacy({
      // 这里的 targets 对应你列出的浏览器最低要求
      targets: [
        'Chrome >= 51',
        'Edge >= 15',
        'Firefox >= 54',
        'Safari >= 10',
        'Opera >= 38',
        'iOS >= 10',
      ],
      // 渲染 legacy 版本的入口脚本
      renderLegacyChunks: true,
      // 包含必要的 Polyfills，确保类似 Promise.finally 等特性正常工作
      modernPolyfills: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0', // 方便局域网/手机调试
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 指向你的 PHP 容器
        changeOrigin: true,
        // 如果 Docker 映射是 ./public/api:/var/www/html
        // 则需去掉路径中的 /api 才能正确访问到 index.php
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
