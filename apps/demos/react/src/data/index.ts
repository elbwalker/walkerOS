import { destinationGoogleGTM } from '@elbwalker/destination-web-google-gtm';

import { elb, webClient, type WebDestination } from '@elbwalker/client-web';

export function setupAnalytics() {
  // Dummy destination to log events to the console
  const destinationLog: WebDestination.Function = {
    config: {},
    type: 'log',
    push: console.log,
  };

  // Optional, but helpful for debugging
  window.elbLayer = [];
  window.elb = elb;

  // Initialize the walkerOS web client
  window.elbwalker = webClient({
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
