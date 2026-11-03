// Malformed pushes: what the page puts on the dataLayer is not always data.
// Real startFlow + capture destination. Do NOT mock collector.push: the
// pipeline captures its terminus when the source is constructed.
import { startFlow } from '@walkeros/collector';
import { sourceDataLayer } from '../index';
import { interceptDataLayer } from '../interceptor';
import type { Collector, WalkerOS } from '@walkeros/core';
import { createLogger, createMockLogger } from '@walkeros/core';

// Web packages run under global fake timers, so settle on microtasks only.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

const getDataLayer = (): unknown[] => {
  const dataLayer = window.dataLayer;
  if (!dataLayer) throw new Error('window.dataLayer is not set');
  return dataLayer;
};

async function startCapture(): Promise<WalkerOS.Event[]> {
  const captured: WalkerOS.Event[] = [];
  await startFlow({
    sources: {
      dataLayer: { code: sourceDataLayer, env: { window } },
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
}

describe('dataLayer source with malformed pushes', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'dataLayer');
  });

  test('delivers a click on a circular web component without the element', async () => {
    const captured = await startCapture();
    const el = document.createElement('x-widget');
    Object.assign(el, { renderOptions: { host: el } });

    getDataLayer().push({
      event: 'gtm.click',
      'gtm.element': el,
      'gtm.elementId': 'cta',
      'gtm.elementClasses': 'btn',
      'gtm.elementUrl': null,
      eventCallback: () => undefined,
    });
    await flush();

    expect(captured).toHaveLength(1);
    expect(captured[0].name).toBe('dataLayer gtm.click');
    expect(captured[0].data).toStrictEqual({
      'gtm.elementId': 'cta',
      'gtm.elementClasses': 'btn',
      'gtm.elementUrl': null,
    });
  });

  test('a throwing getter neither throws nor blocks the push', async () => {
    const captured = await startCapture();
    const evil = { event: 'evil', ok: 1 };
    Object.defineProperty(evil, 'boom', {
      enumerable: true,
      get: () => {
        throw new Error('boom');
      },
    });

    expect(() => getDataLayer().push(evil)).not.toThrow();
    await flush();

    expect(getDataLayer()).toContain(evil);
    expect(captured).toHaveLength(1);
    expect(captured[0].name).toBe('dataLayer evil');
    expect(captured[0].data).toStrictEqual({ ok: 1 });
  });

  test('a name key stays in the data and keeps the event name', async () => {
    const captured = await startCapture();

    getDataLayer().push({ event: 'view_item', name: 'Shirt' });
    await flush();

    expect(captured).toHaveLength(1);
    expect(captured[0].name).toBe('dataLayer view_item');
    expect(captured[0].data).toStrictEqual({ name: 'Shirt' });
  });

  // The one failure the source cannot avoid: its push itself throws. A
  // stub push, since a real collector answers with a result instead.
  test('a failing entry is logged at error and the page push still lands', () => {
    const logger = createMockLogger();
    const push: Collector.PushFn = () => {
      throw new Error('push down');
    };
    const stubWin: Record<string, unknown> = { dataLayer: [] };
    interceptDataLayer(push, { settings: {} }, logger, stubWin);
    const dataLayer = stubWin.dataLayer;
    if (!Array.isArray(dataLayer)) throw new Error('dataLayer not installed');

    expect(() =>
      dataLayer.push({ event: 'first' }, { event: 'second' }),
    ).not.toThrow();

    expect(Array.from(dataLayer)).toEqual([
      { event: 'first' },
      { event: 'second' },
    ]);
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith('dataLayer push not processed', {
      error: expect.any(Error),
    });
  });

  // Two faults at once: the push throws and so does the user's log handler.
  test('a throwing log handler does not skip the page push', () => {
    const logger = createLogger({
      handler: () => {
        throw new Error('handler down');
      },
    });
    const push: Collector.PushFn = () => {
      throw new Error('push down');
    };
    const stubWin: Record<string, unknown> = { dataLayer: [] };
    interceptDataLayer(push, { settings: {} }, logger, stubWin);
    const dataLayer = stubWin.dataLayer;
    if (!Array.isArray(dataLayer)) throw new Error('dataLayer not installed');

    expect(() => dataLayer.push({ event: 'first' })).not.toThrow();

    expect(Array.from(dataLayer)).toStrictEqual([{ event: 'first' }]);
  });

  test('gtag arguments still arrive', async () => {
    const captured = await startCapture();
    function gtag(..._args: unknown[]) {
      getDataLayer().push(arguments);
    }

    gtag('consent', 'update', { ad_storage: 'granted' });
    await flush();

    expect(captured).toHaveLength(1);
    expect(captured[0].name).toBe('dataLayer consent update');
    expect(captured[0].data).toStrictEqual({ ad_storage: 'granted' });
  });
});
