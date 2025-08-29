import type { Elb } from '@walkeros/core';

export const elb: Elb.Fn<void> = function () {
  const w = window as unknown as Record<string, unknown[]>;
  (w.elbLayer = w.elbLayer || []).push(arguments);
};
