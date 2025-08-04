import type { WalkerOS } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationGtag } from '@walkeros/web-destination-gtag';
import { destinationAPI } from '@walkeros/web-destination-api';
import { destinationConsole } from './destinations/console';
import { destinationConsoleBatch } from './destinations/console-batch';
import { destinationDataLayer } from './destinations/data-layer';

// Initialize walker
export async function initializeWalker(): Promise<{
  collector: unknown;
  elb: unknown;
}> {
  // Create collector with destinations and source
  const { collector, elb } = await createCollector({
    consent: { functional: true },
    allowed: true,
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          type: 'browser',
          settings: {
            prefix: 'data-elb',
            pageview: true,
            session: true,
            elb: 'elb',
          },
        },
      },
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
                batch: 5, // Batch visible events in groups of 5
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

  // Check consent state from localStorage
  const consentKey = 'walker_consent';
  const storedConsent = localStorage.getItem(consentKey);

  if (storedConsent === 'accepted') {
    await elb('walker consent', {
      functional: true,
      analytics: true,
      marketing: true,
    });
  } else if (storedConsent === 'denied') {
    await elb('walker consent', {
      functional: true,
      analytics: false,
      marketing: false,
    });
  }

  // Set window.elb to the browser source's elb function
  // It can handle more browser specific commands than the original collector's elb
  // window.elb = collector.sources.browser.elb as WalkerOS.Elb;

  return { collector, elb };
}

// Helper function to update destination settings dynamically
export function updateDestinationSettings(
  destinationId: string,
  settings: Record<string, unknown>,
) {
  if (window.walkerjs?.destinations?.[destinationId]) {
    const destination = window.walkerjs.destinations[destinationId];
    if (destination.config?.settings) {
      Object.assign(destination.config.settings, settings);
      // eslint-disable-next-line no-console
      console.log(`✅ Updated ${destinationId} settings:`, settings);
    }
  }
}
