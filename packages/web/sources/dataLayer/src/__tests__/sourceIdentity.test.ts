// Every event this source emits carries its own identity, so downstream loop
// guards (`event.source.type !== 'dataLayer'`) can tell an echoed event from a
// captured one. Uses a real startFlow: the collector only defaults `source`
// when an event arrives without one, so a mocked push cannot prove this.
import { startFlow } from '@walkeros/collector';
import { sourceDataLayer } from '../index';
import { interceptDataLayer } from '../interceptor';
import type { Collector, WalkerOS } from '@walkeros/core';

// Web packages run under global fake timers, so settle on microtasks only.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

const getDataLayer = (): unknown[] =>
  (window as unknown as Record<string, unknown>)['dataLayer'] as unknown[];

const startCapturingFlow = async (): Promise<WalkerOS.Event[]> => {
  const captured: WalkerOS.Event[] = [];
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
  return captured;
};

describe('dataLayer source identity', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer');
    window.history.replaceState({}, '', '/');
  });

  test('replayed and live entries reach destinations stamped as dataLayer', async () => {
    // Queued BEFORE the flow starts: replayed by processExistingEvents on run.
    (window as unknown as Record<string, unknown>)['dataLayer'] = [
      { event: 'backlog_entry' },
    ];

    const captured = await startCapturingFlow();

    // Live entry through the intercepted dataLayer.push.
    getDataLayer().push({ event: 'live_entry' });
    await flush();

    const sourceOf = (name: string) =>
      captured.find((event) => event.name === name)?.source;

    // jsdom runs at https://example.com/ with an empty document.referrer.
    for (const name of ['dataLayer backlog_entry', 'dataLayer live_entry']) {
      expect(sourceOf(name)).toMatchObject({
        type: 'dataLayer',
        platform: 'web',
        url: window.location.href,
        referrer: document.referrer,
      });
    }
  });

  test('a push after an SPA navigation carries the new url', async () => {
    const captured = await startCapturingFlow();

    window.history.pushState({}, '', '/checkout?step=2');
    getDataLayer().push({ event: 'after_nav' });
    await flush();

    expect(window.location.href).toContain('/checkout?step=2');
    expect(
      captured.find((event) => event.name === 'dataLayer after_nav')?.source
        ?.url,
    ).toBe(window.location.href);
  });

  test('omits url and referrer when the window has no location', () => {
    const pushed: WalkerOS.DeepPartialEvent[] = [];
    const push: Collector.PushFn = async (event) => {
      pushed.push(event);
      return { ok: true };
    };
    const stubWin: Record<string, unknown> = { dataLayer: [] };

    interceptDataLayer(push, { settings: {} }, stubWin);
    const dataLayer = stubWin.dataLayer;
    if (!Array.isArray(dataLayer)) throw new Error('dataLayer not installed');
    dataLayer.push({ event: 'stub_entry' });

    expect(pushed).toHaveLength(1);
    expect(pushed[0].source).toStrictEqual({
      type: 'dataLayer',
      platform: 'web',
    });
  });

  test('an unreadable location or document does not abort the push', () => {
    const pushed: WalkerOS.DeepPartialEvent[] = [];
    const push: Collector.PushFn = async (event) => {
      pushed.push(event);
      return { ok: true };
    };
    const stubWin: Record<string, unknown> = { dataLayer: [] };
    const unreadable = () => {
      throw new Error('blocked');
    };
    Object.defineProperty(stubWin, 'location', {
      get: unreadable,
      configurable: true,
    });
    Object.defineProperty(stubWin, 'document', {
      value: { referrer: 'https://ref.example/' },
      configurable: true,
    });

    interceptDataLayer(push, { settings: {} }, stubWin);
    const dataLayer = stubWin.dataLayer;
    if (!Array.isArray(dataLayer)) throw new Error('dataLayer not installed');
    dataLayer.push({ event: 'guarded_entry' });

    expect(Array.from(dataLayer)).toStrictEqual([{ event: 'guarded_entry' }]);
    expect(pushed).toHaveLength(1);
    expect(pushed[0].source).toStrictEqual({
      type: 'dataLayer',
      platform: 'web',
      referrer: 'https://ref.example/',
    });

    Object.defineProperty(stubWin, 'location', {
      value: { href: 'https://example.com/page' },
    });
    Object.defineProperty(stubWin, 'document', { get: unreadable });
    dataLayer.push({ event: 'guarded_doc' });

    expect(dataLayer).toHaveLength(2);
    expect(pushed[1].source).toStrictEqual({
      type: 'dataLayer',
      platform: 'web',
      url: 'https://example.com/page',
    });
  });
});
