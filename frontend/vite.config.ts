import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The FastAPI backend (later problems) runs on :8000.
// Proxying /api and /media means the browser only ever talks to the Vite dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/media': 'http://127.0.0.1:8000',
    },
  },
})
