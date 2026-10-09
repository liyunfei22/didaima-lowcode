import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 项目内统一用 @/ 指代 src/
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})