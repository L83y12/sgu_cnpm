import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/sgu_cnpm/',
  plugins: [react()],
  server: {
    // Lets phones open the dev server through a Cloudflare quick tunnel for demos.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/uploads': 'http://127.0.0.1:8787',
    },
  },
})
