import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// 检测是否为 PWA 打包模式
const isPwaBuild = process.env.VITE_BUILD_PWA === 'true'

export default defineConfig({
  base: './',
  plugins: [
    // 仅在 PWA 打包模式下启用 PWA 插件
    isPwaBuild && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['xjswpr.svg'],
      manifest: false, // 禁用默认的manifest生成
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ].filter(Boolean)
})
