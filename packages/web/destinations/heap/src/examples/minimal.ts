import type { Flow } from '@walkeros/core';

/** The settings Heap needs to deliver: the App ID, with the Heap SDK loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { appId: 'YOUR_HEAP_APP_ID' },
  config: { loadScript: true },
};
