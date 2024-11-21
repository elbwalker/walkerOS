import { elb, Walkerjs } from '@elbwalker/walker.js';
import { destinationGoogleGTM } from '@elbwalker/destination-web-google-gtm';
import type { WebDestination } from '@elbwalker/walker.js';

export function setupAnalytics() {
  // Dummy destination to log events to the console
  const destinationLog: WebDestination.Destination = {
    config: {},
    type: 'log',
    push: console.log,
  };

  // Optional, but helpful for debugging
  window.elbLayer = [];
  window.elb = elb;

  // Initialize a walker.js instance
  window.walkerjs = Walkerjs({
    destinations: {
      log: destinationLog,
    },
  });

  elb('walker run');

  // Google Tag Manager Destination
  elb('walker destination', destinationGoogleGTM, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
  });

  // Enable the Google Tag Manager destination by setting functional consent
  // elb('walker consent', { functional: true });
}
