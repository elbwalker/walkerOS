import type { Elb } from '@elbwalker/types';

export const elb: Elb.Fn = function () {
  const w = window as unknown as Record<string, unknown[]>;
  // eslint-disable-next-line prefer-rest-params
  (w.elbLayer = w.elbLayer || []).push(arguments);
};
