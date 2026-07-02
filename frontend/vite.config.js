import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow Docker container exposure
    watch: {
      usePolling: true, // Required for HMR to work correctly in Docker on Windows
    }
  }
})
