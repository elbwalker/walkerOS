import type { Destination } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { createSource } from '@walkeros/core';
import { sourceBrowser } from '@walkeros/web-source-browser';
// import { destinationGTM } from '@walkeros/web-destination-gtm';
// import { destinationGA4 } from '@walkeros/web-destination-ga4';
// import { destinationMeta } from '@walkeros/web-destination-meta';

declare global {
  interface Window {
    elbEvents: unknown[];
  }
}

// Import the BrowserPush type for proper type inference
import type { BrowserPush } from '@walkeros/web-source-browser';

// Export the elb function once collector is initialized
export let elb: BrowserPush;

export async function setupAnalytics() {
  // Dummy destination to log events to the console
  const destinationLog: Destination.InitDestination = {
    type: 'log',
    push: (...args) => {
      console.log('🔍 Destination Log:', ...args);
    },
  };

  // Initialize a walkerOS unified collector without sources
  const { collector } = await createCollector({
    tagging: 2,
    destinations: {
      log: destinationLog,
      elbEvents: {
        init: () => {
          window.elbEvents = [];
          console.log('📦 elbEvents destination initialized');
        },
        push: (event) => {
          console.log('📤 elbEvents destination received:', event);
          window.elbEvents.push(event);
        },
      },
    },
    consent: { functional: true },
  });

  (window as any).collector = collector;
  // Create and initialize the browser source using the new architecture
  const browserSource = await createSource(collector, sourceBrowser, {
    type: 'browser',
    settings: {
      prefix: 'data-elb',
      scope: document,
      pageview: true,
      session: true,
    },
  });
  console.log('🚀 ~ browserSource:', browserSource);

  // Export the source's elb function for use in components
  elb = browserSource.elb;

  // Make elb function globally available for manual testing
  (window as any).elb = elb;

  // // Google Tag Manager Destination
  // await elb('walker destination', destinationGTM, {
  //   consent: { functional: true },
  //   mapping: { '*': { '*': {} } },
  //   settings: {
  //     containerId: 'GTM-XXXXXXX', // Replace with your GTM container ID
  //     loadScript: false, // Set to true to load GTM script
  //   },
  // });

  // // Google Analytics 4 Destination
  // await elb('walker destination', destinationGA4, {
  //   consent: { functional: true },
  //   mapping: { '*': { '*': {} } },
  //   settings: {
  //     measurementId: 'G-XXXXXXXXXX', // Replace with your GA4 measurement ID
  //     loadScript: false, // Set to true to load GA4 script
  //   },
  // });

  // // Meta Pixel Destination
  // await elb('walker destination', destinationMeta, {
  //   consent: { functional: true },
  //   mapping: { '*': { '*': {} } },
  //   settings: {
  //     pixelId: '1234567890', // Replace with your Meta Pixel ID
  //   },
  // });

  // Enable destinations by setting functional consent
  await elb('walker consent', { functional: true });
}
