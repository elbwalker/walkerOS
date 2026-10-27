import type { Flow } from '@walkeros/core';

/** The settings Optimizely needs to deliver: the SDK key and the mapping that resolves the user ID. */
export const minimal: Flow.MinimalExample = {
  settings: { sdkKey: 'YOUR_SDK_KEY', userId: 'user.id' },
};
