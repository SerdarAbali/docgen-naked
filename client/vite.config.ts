import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiUrl = mode === 'production' 
    ? 'https://api.documentit.io' 
    : 'http://10.0.0.59:3001';

  const hostName = mode === 'production'
    ? 'app.documentit.io'
    : '10.0.0.59';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: ['app.documentit.io', 'localhost', '127.0.0.1', '10.0.0.59'],
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: mode === 'production'
        }
      },
      open: true,
      base: '/',
      cors: true,
      hmr: {
        host: hostName,
        port: 3000
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html')
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});