import Elbwalker from '@elbwalker/walker.js';
import DestinationGTM from '@elbwalker/destination-web-google-gtm';

export function walker() {
  (window.elbLayer = window.elbLayer || []).push(arguments);
}

export function setupAnalytics() {
  window.elbLayer = [];
  walker('walker destination', { push: console.log });
  walker('walker destination', DestinationGTM);

  window.elbwalker = Elbwalker({ custom: true });
}
