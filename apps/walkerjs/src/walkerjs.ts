import { parseInlineConfig } from '@walkeros/web-core';
import { createWalkerjs } from './index';
import type { Config } from './types';

if (window && document) {
  const initializeWalker = async () => {
    let globalConfig: Config | undefined;

    // Check for config from script tag
    const scriptElement = document.querySelector('script[data-elbconfig]');
    if (scriptElement) {
      const configValue = scriptElement.getAttribute('data-elbconfig') || '';

      if (configValue.includes(':')) {
        // Inline config: "elb:track;run:false;instance:myWalker"
        globalConfig = parseInlineConfig(configValue) as Config;
      } else if (configValue) {
        // Named config: "myWalkerConfig"
        globalConfig = window[configValue] as Config;
      }
    }

    // Fallback to window.elbConfig
    if (!globalConfig) globalConfig = window.elbConfig as Config;

    // Auto-initialize if config is found
    if (globalConfig) {
      await createWalkerjs(globalConfig);
    }
  };

  // Initialize immediately if DOM is ready, otherwise wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWalker);
  } else {
    initializeWalker();
  }
}
