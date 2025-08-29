import type { Collector, WalkerOS } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { createSource } from '@walkeros/core';
import { createTagger, sourceBrowser } from '@walkeros/web-source-browser';
import destinationGtag from '@walkeros/web-destination-gtag';
import destinationAPI from '@walkeros/web-destination-api';
import {
  destinationConsole,
  destinationConsoleBatch,
} from './destinations/console';
import { destinationDataLayer } from './destinations/data-layer';

declare global {
  interface Window {
    elb: WalkerOS.Elb;
    walker: Collector.Instance;
  }
}

// Initialize walker
export async function initializeWalker(): Promise<void> {
  // Skip initialization if already done
  if (window.walker) return;

  // Create collector with destinations and source (run: false for manual pageview control)
  const { collector } = await createCollector({
    run: false,
    consent: { functional: true },
    sources: {
      browser: createSource(sourceBrowser, {
        settings: {
          pageview: true,
          session: true,
          elb: 'elb',
        },
      }),
    },
    destinations: {
      console: destinationConsole,
      consoleBatch: {
        ...destinationConsoleBatch,
        config: {
          // Configure which events should be batched
          mapping: {
            '*': {
              visible: {
                batch: 1000,
              },
            },
          },
        },
      },
      api: {
        ...destinationAPI,
        config: {
          settings: {
            url: 'https://httpbin.org/post',
          },
          consent: {
            analytics: true,
          },
        },
      },
      ga4: {
        ...destinationGtag,
        config: {
          settings: {
            ga4: { measurementId: 'G-XXXXXXXXXX' },
          },
          consent: {
            analytics: true,
            marketing: true,
          },
        },
      },
      dataLayer: destinationDataLayer,
    },
  });

  // Set global window objects
  window.walker = collector;

  // Check consent state from localStorage
  const consentKey = 'walker_consent';
  const storedConsent = localStorage.getItem(consentKey);

  if (storedConsent === 'accepted') {
    await collector.push('walker consent', {
      functional: true,
      analytics: true,
      marketing: true,
    });
  } else if (storedConsent === 'denied') {
    await collector.push('walker consent', {
      functional: true,
      analytics: false,
      marketing: false,
    });
  }
}

// Centralized tagger configuration
const taggerInstance = createTagger({
  prefix: 'data-elb', // Match the browser source prefix
});

// Simple tagger export for use in components
export function tagger(entity?: string) {
  return taggerInstance(entity);
}
