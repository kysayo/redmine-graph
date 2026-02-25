import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'MocaReactGraph',
      fileName: 'moca-react-graph',
      formats: ['iife'],
    },
    cssCodeSplit: false,
  },
})
