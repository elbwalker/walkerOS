import { defineConfig, buildModules } from '@elbwalker/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {
      mangle: {
        properties: {
          regex: /^[A-Z]/, // Only mangle capitalized properties
          reserved: [
            // Prevent mangle from renaming these properties
          ],
        },
      },
    },
  }),
]);
