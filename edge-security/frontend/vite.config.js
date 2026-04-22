import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

// Suppress benign WebSocket proxy errors caused by browser reloads
const logger = createLogger()
const _error = logger.error.bind(logger)
logger.error = (msg, opts) => {
  if (msg.includes('ECONNABORTED') || msg.includes('ECONNRESET')) return
  _error(msg, opts)
}

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
