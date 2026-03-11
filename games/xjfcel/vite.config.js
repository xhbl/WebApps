import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const isPwaBuild = process.env.VITE_BUILD_PWA === 'true'

export default defineConfig({
  base: './',
  plugins: [
    isPwaBuild && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['xjfcel.svg'],
      manifest: false,
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff}']
      }
    })
  ].filter(Boolean)
})
