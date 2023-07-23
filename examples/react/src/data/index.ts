import Elbwalker, { elb, WebDestination } from '@elbwalker/walker.js';
import DestinationGTM from '@elbwalker/destination-web-google-gtm';

export function setupAnalytics() {
  window.elbLayer = [];
  window.elbwalker = Elbwalker();
  window.elb = elb;

  // Google Tag Manager
  DestinationGTM.config = {
    consent: { functional: true },
    mapping: { '*': { '*': {} } },
  };
  elb('walker destination', DestinationGTM);

  elb('walker destination', {
    push: console.log,
  } as WebDestination.Function);
}
