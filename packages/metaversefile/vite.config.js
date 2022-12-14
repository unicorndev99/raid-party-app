// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.js'),
      name: 'metaversefile',
      // the proper extensions will be added
      fileName: (format) => `metaversefile.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  }
})