import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: 'index.html',
        simulator: 'simulator.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor')) return 'monaco-vendor'
          if (id.includes('blockly')) return 'blockly-vendor'
          if (id.includes('@xterm')) return 'xterm-vendor'
          if (id.includes('three')) return 'three-vendor'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
