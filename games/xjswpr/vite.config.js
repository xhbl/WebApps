import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// 检测是否为 PWA 打包模式
const isPwaBuild = process.env.VITE_BUILD_PWA === 'true'
const version = pkg.version

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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,mp3}']
      }
    }),
    // 构建时为 public 目录下的静态资源添加版本号，解决浏览器缓存问题
    {
      name: 'static-version-plugin',
      transformIndexHtml(html) {
        // 匹配 href 或 src 属性引用 public 目录下的资源
        // 排除 ./assets/ 路径（由 Vite 自动处理，已有哈希）
        // 支持 #hash 后缀（如 SVG sprite: ./icons.svg#icon-name）
        return html.replace(
          /(href|src)="(\.\/(?!assets\/)[^"?#]+)([^"]*)"/g,
          (match, attr, path, suffix) => {
            // 避免重复添加版本号
            if (suffix.includes('v=')) return match
            return `${attr}="${path}?v=${version}${suffix}"`
          }
        )
      }
    }
  ].filter(Boolean)
})
