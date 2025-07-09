import type { Elb } from '@walkerOS/core';

export const elb: Elb.Fn = function () {
  const w = window as unknown as Record<string, unknown[]>;
  (w.elbLayer = w.elbLayer || []).push(arguments);
};
