import type { Env, SegmentAnalyticsMock } from '../types';

const noop = () => {};
const asyncNoop = () => Promise.resolve();

function createMockAnalytics(): SegmentAnalyticsMock {
  return {
    track: noop,
    identify: noop,
    group: noop,
    page: noop,
    screen: noop,
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
