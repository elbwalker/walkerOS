import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000900 }),
  mapping: {},
  out: getEvent('page view', { timestamp: 1700000900 }),
};

export const orderComplete: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000901 }),
  mapping: {},
  out: getEvent('order complete', { timestamp: 1700000901 }),
};
