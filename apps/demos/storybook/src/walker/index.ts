import type { Collector, WalkerOS } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';

declare global {
  interface Window {
    elb: WalkerOS.Elb;
    walker: Collector.Instance;
  }
}

// Simple console destination for Storybook demo
const destinationConsole = {
  type: 'console',
  push: (event: WalkerOS.Event) => {
    console.log('📊 walkerOS Event:', event);
  },
  config: {},
};

// Initialize walker for Storybook demo
export async function initializeWalker(): Promise<void> {
  // Skip initialization if already done
  if (window.walker) return;

  try {
    // Create collector with browser source and console destination
    const { collector, elb } = await createCollector({
      run: true,
      consent: { functional: true },
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            settings: {
              pageview: true,
              session: false, // Disable session for Storybook
              elb: 'elb',
              prefix: 'data-elb',
            },
          },
        },
      },
      destinations: {
        console: destinationConsole,
      },
    });

    // Set global window objects
    window.walker = collector;
    window.elb = elb;
  } catch (error) {
    console.error('Failed to initialize walkerOS:', error);
  }
}
