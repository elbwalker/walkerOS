import type { Destination } from '@walkerOS/core';
import { createCollector } from '@walkerOS/collector';
import { sourceBrowser } from '@walkerOS/web-source-browser';
import { destinationGTM } from '@walkerOS/web-destination-gtm';
import { destinationGA4 } from '@walkerOS/web-destination-ga4';
import { destinationMeta } from '@walkerOS/web-destination-meta';

declare global {
  interface Window {
    elbEvents: unknown[];
  }
}

// Export the elb function once collector is initialized
import type { BrowserPush } from '@walkerOS/web-source-browser';

export let elb: BrowserPush;

export async function setupAnalytics() {
  // Dummy destination to log events to the console
  const destinationLog: Destination.InitDestination = {
    type: 'log',
    push: console.log,
  };

  // Initialize a walkerOS unified collector with browser source
  const walker = await createCollector({
    tagging: 2,
    session: false,
    run: true,
    sources: [
      sourceBrowser({
        prefix: 'data-elb',
        scope: document,
        pageview: true,
        session: true,
        listeners: true,
      }),
    ],
    destinations: {
      log: destinationLog,
      elbEvents: {
        init: () => {
          window.elbEvents = [];
        },
        push: (event) => {
          window.elbEvents.push(event);
        },
      },
    },
    consent: { functional: true },
  });

  // Export the push function as elb for use in components, cast to browser interface
  elb = walker.elb as unknown as BrowserPush;

  // Google Tag Manager Destination
  await elb('walker destination', destinationGTM, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
    settings: {
      containerId: 'GTM-XXXXXXX', // Replace with your GTM container ID
      loadScript: false, // Set to true to load GTM script
    },
  });

  // Google Analytics 4 Destination
  await elb('walker destination', destinationGA4, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
    settings: {
      measurementId: 'G-XXXXXXXXXX', // Replace with your GA4 measurement ID
      loadScript: false, // Set to true to load GA4 script
    },
  });

  // Meta Pixel Destination
  await elb('walker destination', destinationMeta, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
    settings: {
      pixelId: '1234567890', // Replace with your Meta Pixel ID
    },
  });

  // Enable destinations by setting functional consent
  await elb('walker consent', { functional: true });
}
