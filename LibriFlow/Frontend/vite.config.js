import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true,
    fs: { allow: ['.', fileURLToPath(new URL('../chung', import.meta.url))] } },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ["./src/kiem-thu/thiet-lap.js"],
    include: ['src/**/*.test.{js,jsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
})
