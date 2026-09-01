import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/work-kanban/'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-icon.svg'],
      manifest: {
        name: '看板',
        short_name: '看板',
        description: '个人离线看板',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        lang: 'zh-CN',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: { navigateFallback: `${base}index.html` }
    })
  ],
  base
})
