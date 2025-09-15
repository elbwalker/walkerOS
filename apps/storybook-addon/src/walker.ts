import type { Collector, WalkerOS, Destination } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { addons } from 'storybook/preview-api';
import { EVENTS } from './constants';

declare global {
  interface Window {
    __storybookElb: WalkerOS.Elb;
    __storybookWalker: Collector.Instance;
  }
}

// Simple console destination for Storybook
const destinationConsole = {
  type: 'console',
  push: (event: WalkerOS.Event, context: Destination.PushContext) => {
    console.log('Storybook Event:', event);
  },
  config: {},
};

// Live destination for Storybook panel
const destinationLive = {
  type: 'live',
  push: (event: WalkerOS.Event, context: Destination.PushContext) => {
    // Send event to Storybook panel for live display
    const channel = addons.getChannel();
    if (channel) {
      channel.emit(EVENTS.LIVE_EVENT, event);
    }
  },
  config: {},
};

// Function to get Storybook iframe context
function getIframeContext() {
  try {
    // Try to get iframe from parent document (manager context)
    const iframe = parent.document.querySelector(
      '#storybook-preview-iframe',
    ) as HTMLIFrameElement;
    if (iframe?.contentDocument && iframe?.contentWindow) {
      return {
        document: iframe.contentDocument,
        window: iframe.contentWindow,
      };
    }
  } catch (e) {
    // If we can't access parent, we're likely already in iframe context
  }

  // Fallback to current context
  return { document, window };
}

export async function initializeWalker(config?: {
  prefix?: string;
  autoRefresh?: boolean;
}): Promise<void> {
  // Skip initialization if already done
  if (window.__storybookWalker) return;

  try {
    // Get iframe context for proper event capture
    const { document: iframeDoc, window: iframeWin } = getIframeContext();

    if (!iframeDoc) {
      console.warn('Document not available, skipping walkerOS initialization');
      return;
    }

    // Create collector with browser source and destinations
    const result = await createCollector({
      run: true,
      consent: { functional: true },
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            settings: {
              pageview: true,
              session: false, // Disable session for Storybook
              elb: '__storybookElb',
              prefix: config?.prefix || 'data-custom',
              scope: iframeDoc.body || iframeDoc, // Set scope to iframe document
            },
          },
          env: {
            window: iframeWin,
            document: iframeDoc,
          },
        },
      },
      destinations: {
        console: { code: destinationConsole },
        live: { code: destinationLive },
      },
    });

    const { collector, elb } = result;

    // Verify collector was created successfully
    if (!collector) {
      throw new Error('Collector creation failed - no collector returned');
    }

    // Set global window objects
    window.__storybookWalker = collector;
    window.__storybookElb = elb;
  } catch (error) {
    console.error('Failed to initialize walkerOS:', error);
  }
}
