import {
  destinationGoogleGTM,
  type DestinationGoogleGTM,
} from '@elbwalker/destination-web-google-gtm';

import { elb, webClient } from '@elbwalker/client-web';

export function setupAnalytics() {
  // Dummy destination to log events to the console
  const destinationLog: DestinationGoogleGTM.Function = {
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

  // Google Tag Manager
  elb('walker destination', destinationGoogleGTM, {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
  });

  // Enable the Google Tag Manager destination by setting functional consent
  // elb('walker consent', { functional: true });
}
