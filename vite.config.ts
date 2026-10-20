import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Base path: '/' di dev, '/mini-game/' di GitHub Pages, '/' di Vercel.
export default defineConfig(({ command }) => ({
  base: command === 'build' && !process.env.VERCEL ? '/mini-game/' : '/',
  plugins: [react(), tailwindcss()],
}))
