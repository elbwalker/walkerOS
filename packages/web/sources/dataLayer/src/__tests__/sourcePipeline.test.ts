// Proves source-level pipeline config executes for dataLayer events.
// Real startFlow + spy destination + a 'tap' transformer as the source's next
// chain. Do NOT mock collector.push: the pipeline captures its terminus when
// the source is constructed, so a later override would not be observed.
import { startFlow } from '@walkeros/collector';
import { sourceDataLayer } from '../index';
import type { Transformer, WalkerOS } from '@walkeros/core';

// Web packages run under global fake timers, so settle on microtasks only.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

const getDataLayer = (): unknown[] =>
  (window as unknown as Record<string, unknown>)['dataLayer'] as unknown[];

describe('dataLayer source pipeline routing', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer');
  });

  test('a next chain runs for both replayed backlog and live entries', async () => {
    const seen: string[] = [];
    const captured: WalkerOS.Event[] = [];

    // Queued BEFORE the flow starts: replayed by processExistingEvents on run.
    (window as unknown as Record<string, unknown>)['dataLayer'] = [
      { event: 'backlog_entry' },
    ];

    const { collector } = await startFlow({
      sources: {
        dataLayer: {
          code: sourceDataLayer,
          // `env.window` is not defaulted by this source; supply it so the
          // interceptor installs (same reason examples/trigger.ts patches it).
          env: { window },
          next: 'tap',
        },
      },
      transformers: {
        tap: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'tap',
            config: context.config,
            push: async (event) => {
              seen.push(event.name ?? '');
              return { event };
            },
          }),
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

    expect(seen).toContain('dataLayer backlog_entry');
    expect(captured.map((e) => e.name)).toContain('dataLayer backlog_entry');

    // Live entry through the intercepted dataLayer.push.
    getDataLayer().push({ event: 'live_entry' });
    await flush();

    expect(seen).toContain('dataLayer live_entry');
    expect(captured.map((e) => e.name)).toContain('dataLayer live_entry');

    // Both events are attributed to the source.
    expect(collector.status.sources.dataLayer?.count).toBe(2);
  });
});
