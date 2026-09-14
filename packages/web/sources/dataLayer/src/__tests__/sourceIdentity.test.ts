// Every event this source emits carries its own identity, so downstream loop
// guards (`event.source.type !== 'dataLayer'`) can tell an echoed event from a
// captured one. Uses a real startFlow: the collector only defaults `source`
// when an event arrives without one, so a mocked push cannot prove this.
import { startFlow } from '@walkeros/collector';
import { sourceDataLayer } from '../index';
import type { WalkerOS } from '@walkeros/core';

// Web packages run under global fake timers, so settle on microtasks only.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

const getDataLayer = (): unknown[] =>
  (window as unknown as Record<string, unknown>)['dataLayer'] as unknown[];

describe('dataLayer source identity', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer');
  });

  test('replayed and live entries reach destinations stamped as dataLayer', async () => {
    const captured: WalkerOS.Event[] = [];

    // Queued BEFORE the flow starts: replayed by processExistingEvents on run.
    (window as unknown as Record<string, unknown>)['dataLayer'] = [
      { event: 'backlog_entry' },
    ];

    await startFlow({
      sources: {
        dataLayer: {
          code: sourceDataLayer,
          // `env.window` is not defaulted by this source; supply it so the
          // interceptor installs.
          env: { window },
        },
      },
      destinations: {
        cap: {
          code: {
            type: 'capture',
            config: {},
            push: (event: WalkerOS.Event) => {
              captured.push(event);
            },
          },
        },
      },
    });
    await flush();

    // Live entry through the intercepted dataLayer.push.
    getDataLayer().push({ event: 'live_entry' });
    await flush();

    const sourceOf = (name: string) =>
      captured.find((event) => event.name === name)?.source;

    expect(sourceOf('dataLayer backlog_entry')).toMatchObject({
      type: 'dataLayer',
      platform: 'web',
    });
    expect(sourceOf('dataLayer live_entry')).toMatchObject({
      type: 'dataLayer',
      platform: 'web',
    });
  });
});
