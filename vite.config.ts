import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { VitePWA } from 'vite-plugin-pwa'

const isWebTarget = process.env.VITE_TARGET === 'web'

function copySqlWasm(): { name: string; buildStart(): void } {
  return {
    name: 'copy-sql-wasm',
    buildStart() {
      if (!isWebTarget) return
      const src = path.resolve('node_modules/sql.js/dist/sql-wasm.wasm')
      const dest = path.resolve('public/sql-wasm.wasm')
      if (fs.existsSync(src)) fs.copyFileSync(src, dest)
    },
  }
}

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.wasm'],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    'import.meta.env.VITE_TARGET': JSON.stringify(process.env.VITE_TARGET ?? 'desktop'),
  },
  server: {
    headers: {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(isWebTarget
      ? [
          copySqlWasm(),
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.png', 'logo.png', 'sql-wasm.wasm'],
            manifest: {
              name: 'DentAssist Pro',
              short_name: 'DentAssist',
              description: 'نظام إدارة عيادة أسنان — يعمل على الحاسوب والهاتف والتابلت',
              theme_color: '#0d1424',
              background_color: '#f8fafc',
              display: 'standalone',
              orientation: 'any',
              start_url: './',
              lang: 'ar',
              dir: 'rtl',
              icons: [
                {
                  src: 'logo.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: 'logo.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
                {
                  src: 'favicon.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,svg,wasm,woff2}'],
              navigateFallback: 'index.html',
            },
          }),
        ]
      : [
          electron([
            {
              entry: 'electron/main.ts',
              vite: {
                resolve: {
                  alias: {
                    '@': path.resolve(__dirname, 'src'),
                  },
                },
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    external: ['better-sqlite3', 'electron'],
                  },
                },
              },
            },
            {
              entry: 'electron/preload.ts',
              onstart({ reload }) {
                reload()
              },
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    external: ['electron'],
                  },
                },
              },
            },
          ]),
          renderer(),
        ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: isWebTarget ? 'dist-web' : 'dist',
  },
})
