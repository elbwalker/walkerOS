import type { Env, RudderStackAnalyticsMock } from '../types';

type SdkCall = (_params: Record<string, unknown>) => void;
type SdkFlush = (
  _callback?: (err?: Error, data?: unknown) => void,
) => Promise<void>;

const noop: SdkCall = () => {};
const asyncNoop: SdkFlush = () => Promise.resolve();

function createMockAnalytics(): RudderStackAnalyticsMock {
  return {
    track: noop,
    identify: noop,
    group: noop,
    page: noop,
    screen: noop,
    alias: noop,
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
