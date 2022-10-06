import Elbwalker from '@elbwalker/walker.js';
import DestinationGTM from '@elbwalker/destination-web-google-gtm';

export function walker(...args: unknown[]) {
  (window.elbLayer = window.elbLayer || []).push(...args);
}

export function setupAnalytics() {
  window.elbLayer = [];
  window.elbwalker = Elbwalker({ custom: true });

  walker('walker destination', DestinationGTM);
  walker('walker destination', { push: console.log });
}
