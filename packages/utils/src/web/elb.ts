import type { WalkerOS } from '@elbwalker/types';

declare global {
  interface Window {
    elbLayer: ElbLayer;
    elb: WalkerOS.Elb;
  }
}

export type ElbLayer = Array<IArguments>;

export const elb: WalkerOS.Elb = function () {
  // eslint-disable-next-line prefer-rest-params
  (window.elbLayer = window.elbLayer || []).push(arguments);
};
