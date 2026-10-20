import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Base path otomatis: '/' untuk dev/local, '/mini-game/' untuk GitHub Pages.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mini-game/' : '/',
  plugins: [react(), tailwindcss()],
}))
