import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
// One HTML entry per demo page; a new demo is one more entry. The pages are
// served under the website's `demos/` path (and its PR previews' prefix), so
// every asset URL is relative.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        shop: page('shop/index.html'),
        media: page('media/index.html'),
      },
    },
  },
});
