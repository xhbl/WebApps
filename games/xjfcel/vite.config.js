import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import pkg from './package.json' with { type: 'json' }

// 检测是否为 PWA 构建模式
const isPwaBuild = process.env.VITE_BUILD_PWA === 'true'
const version = pkg.version

export default defineConfig({
  base: './',
  
  // 配置路径别名，引用common资源
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@common': path.resolve(__dirname, '../common')
    }
  },
  
  // 开发服务器配置，允许访问上级目录
  server: {
    fs: {
      allow: ['..']
    }
  },
  
  plugins: [
    // 仅在 PWA 构建模式下启用 PWA 插件
    isPwaBuild && VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // 禁用默认的manifest生成
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,mp3}']
      }
    }),
    // 构建时为 public 目录下的静态资源添加版本号，用于缓存管理
    {
      name: 'static-version-plugin',
      transformIndexHtml(html) {
        // 匹配 href 和 src 属性，仅处理 public 目录下的资源
        // 排除 ./assets/ 路径，因为 Vite 自动处理这些资源并添加哈希
        // 支持 #hash 后缀，例如 SVG sprite: ./icons.svg#icon-name
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
