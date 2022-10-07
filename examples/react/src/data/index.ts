import Elbwalker from '@elbwalker/walker.js';
import DestinationGTM from '@elbwalker/destination-web-google-gtm';
import DestinationGA4 from './ga4';
import Data from './plan';

export function walker(...args: unknown[]) {
  (window.elbLayer = window.elbLayer || []).push(...args);
}

export function setupAnalytics() {
  window.elbLayer = [];
  window.elbwalker = Elbwalker({ custom: true });

  walker('walker destination', DestinationGTM);

  walker('walker destination', {
    push: console.log,
    config: Data.Plan.destinations.console.config,
  });
}

export default Data;
