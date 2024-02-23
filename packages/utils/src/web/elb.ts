import type { WalkerOS } from '@elbwalker/types';

export type ElbLayer = Array<IArguments>;

export const elb: WalkerOS.Elb = function () {
  const w = window as unknown as Record<string, unknown[]>;
  // eslint-disable-next-line prefer-rest-params
  (w.elbLayer = w.elbLayer || []).push(arguments);
};
