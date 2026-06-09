import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'file-mode': {
    text: 'Default mode is structured: values are StoreValue data round-tripped through the shared core codec and stored with Content-Type application/json, good for session state, lookups, and cached responses. Set config.file: true to persist raw bytes byte-exact with the real mime derived from the key (set accepts Uint8Array or string), the mode for serving assets such as walker.js via the file transformer. One store instance is exactly one mode. Do not pair file: true with a cache; the cache wraps structured stores and flow_validate flags the combination.',
  },
};
