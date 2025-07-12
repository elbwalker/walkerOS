import { elb, webCollector } from '@walkerOS/web-collector';
import { destinationGTM } from '@walkerOS/web-destination-gtm';
import { destinationGA4 } from '@walkerOS/web-destination-ga4';
import { destinationMeta } from '@walkerOS/web-destination-meta';
import { Destination } from '@walkerOS/core';

declare global {
  interface Window {
    elbEvents: unknown[];
  }
}

export function setupAnalytics() {
  // Dummy destination to log events to the console
  const destinationLog: Destination.InitDestination = {
    type: 'log',
    push: console.log,
  };

  // Initialize a walkerOS web collector instance
  webCollector({
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
    run: true,
    elb: 'elb',
    name: 'walkerjs',
  });

  // Google Tag Manager Destination
  elb('walker destination', destinationGTM, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
    settings: {
      containerId: 'GTM-XXXXXXX', // Replace with your GTM container ID
      loadScript: false, // Set to true to load GTM script
    },
  });

  // Google Analytics 4 Destination
  elb('walker destination', destinationGA4, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
    settings: {
      measurementId: 'G-XXXXXXXXXX', // Replace with your GA4 measurement ID
      loadScript: false, // Set to true to load GA4 script
    },
  });

  // Meta Pixel Destination
  elb('walker destination', destinationMeta, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
    settings: {
      pixelId: '1234567890', // Replace with your Meta Pixel ID
    },
  });

  // Enable destinations by setting functional consent
  elb('walker consent', { functional: true });
}
