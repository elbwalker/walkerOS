import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'structured-only': {
    text: 'The Sheets store is structured-only: each cell holds a structured StoreValue JSON value. There is no byte-native mode, so config.file: true is a hard error at init and a value carrying a binary (Uint8Array) leaf is rejected. For byte-exact asset serving (walker.js and friends) use fs, s3, or gcs with file: true instead. Sheets is also not a cache backing; pair it with a cache wrapper to absorb its rate limit, but the Sheets store itself stores only structured cells.',
  },
};
