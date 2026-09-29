import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths work both at the site root and at /<repo>/ on Pages.
  base: './',
  plugins: [react()],
})
