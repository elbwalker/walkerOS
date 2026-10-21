import type { Env, SegmentAnalyticsMock, SegmentCallback } from '../types';

/** Every call is delivered: its callback answers without a reason. */
const delivered = (_params: unknown, callback?: SegmentCallback) =>
  callback?.();
const asyncNoop = () => Promise.resolve();

function createMockAnalytics(): SegmentAnalyticsMock {
  return {
    track: delivered,
    identify: delivered,
    group: delivered,
    page: delivered,
    screen: delivered,
    flush: asyncNoop,
    closeAndFlush: asyncNoop,
  };
}

export const push: Env = {
  analytics: createMockAnalytics(),
};

export const simulation = [
  'call:analytics.track',
  'call:analytics.identify',
  'call:analytics.group',
  'call:analytics.page',
  'call:analytics.screen',
];
