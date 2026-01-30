import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/image-viewer/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'folder-list-api',
      configureServer(server) {
        server.middlewares.use('/api/folders', (req, res) => {
          const imagesDir = path.join(process.cwd(), 'public', 'images');
          try {
            if (!fs.existsSync(imagesDir)) {
              fs.mkdirSync(imagesDir, { recursive: true });
            }
            const entries = fs.readdirSync(imagesDir, { withFileTypes: true });
            const folders = entries
              .filter(entry => entry.isDirectory())
              .map(entry => entry.name);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ folders }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message, folders: [] }));
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
