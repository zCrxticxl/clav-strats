import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react({ include: /\.[jt]sx?$/ })],
  define: {
    'process.env.REACT_APP_COLLAB_URL': JSON.stringify(process.env.REACT_APP_COLLAB_URL || ''),
    'process.env.PUBLIC_URL': JSON.stringify(mode === 'development' ? '' : './'),
  },
  server: {
    port: 3000,
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
}));
