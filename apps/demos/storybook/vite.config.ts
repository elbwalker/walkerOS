import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
// One HTML entry per page of the demo site; a new demo is one more entry.
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        main: page('index.html'),
        shop: page('shop/index.html'),
        media: page('media/index.html'),
      },
    },
  },
});
