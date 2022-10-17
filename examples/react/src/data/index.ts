import Elbwalker from '@elbwalker/walker.js';
import DestinationGTM from '@elbwalker/destination-web-google-gtm';
import Data from './plan';

export function elb(...args: unknown[]) {
  (window.elbLayer = window.elbLayer || []).push(...args);
}

export function setupAnalytics() {
  window.elbwalker = Elbwalker();

  elb('walker destination', DestinationGTM);
  elb('walker destination', {
    push: console.log,
  });
}

export default Data;
