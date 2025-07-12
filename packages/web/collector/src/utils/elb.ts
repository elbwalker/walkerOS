import type { ElbCore } from '@walkerOS/core';

export const elb: ElbCore.Fn = function () {
  const w = window as unknown as Record<string, unknown[]>;
  (w.elbLayer = w.elbLayer || []).push(arguments);
};
