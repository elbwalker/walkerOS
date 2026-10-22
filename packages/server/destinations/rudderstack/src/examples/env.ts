import type {
  Env,
  RudderStackAnalyticsMock,
  RudderStackCallback,
} from '../types';

/** Every call is sent: its callback answers without an error. */
const sent = (_params: unknown, callback?: RudderStackCallback) => callback?.();
const asyncNoop = () => Promise.resolve();

function createMockAnalytics(): RudderStackAnalyticsMock {
  return {
    track: sent,
    identify: sent,
    group: sent,
    page: sent,
    screen: sent,
    alias: sent,
    flush: asyncNoop,
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
  'call:analytics.alias',
];
