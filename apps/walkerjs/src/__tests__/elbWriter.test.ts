import type { Elb, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';

/**
 * The browser source installs its own `window.elb` writer, which routes through
 * the elbLayer controller. `createWalkerjs` assigns `flow.elb` over that name,
 * and `flow.elb` is the source's raw push: it skips the layer entirely.
 *
 * These are not interchangeable functions. The differences below are what a
 * page observes, so removing the assignment in `createWalkerjs` is a behavior
 * change for every walker.js page, not a cleanup.
 */

type AnyPush = (...args: unknown[]) => Promise<Elb.PushResult>;

const isPush = (value: unknown): value is AnyPush =>
  typeof value === 'function';

const getInstalledElb = (): AnyPush => {
  const value: unknown = Reflect.get(window, 'elb');
  if (!isPush(value)) throw new Error('window.elb is not a function');
  return value;
};

const readLayer = (): unknown[] => {
  const value: unknown = Reflect.get(window, 'elbLayer');
  return Array.isArray(value) ? value : [];
};

describe('window.elb writer versus flow.elb', () => {
  const received: WalkerOS.Event[] = [];
  const names = () => received.map((event) => event.name);

  // Each flow gets its own scope element, so no two of them contend for the
  // document node and every one of them owns the scope it scans.
  const createScope = (html = ''): HTMLElement => {
    const scope = document.createElement('div');
    scope.innerHTML = html;
    document.body.appendChild(scope);
    return scope;
  };

  const mockDestination = {
    code: {
      type: 'mock',
      config: {},
      push: (event: WalkerOS.Event) => {
        received.push(event);
      },
    },
  };

  const start = (settings: Record<string, unknown>, run = true) =>
    startFlow({
      run,
      sources: { browser: { code: sourceBrowser, config: { settings } } },
      destinations: { mock: mockDestination },
    });

  beforeEach(() => {
    received.length = 0;
    Reflect.deleteProperty(window, 'elb');
    Reflect.deleteProperty(window, 'elbLayer');
  });

  test('flow.elb is the source push, the installed writer is not', async () => {
    const flow = await start({ pageview: false, scope: createScope() });

    expect(flow.elb).toBe(flow.collector.sources.browser.push);
    expect(getInstalledElb()).not.toBe(flow.elb);
  });

  test('only the installed writer records into elbLayer', async () => {
    const flow = await start({ pageview: false, scope: createScope() });

    await getInstalledElb()('via installed');
    expect(readLayer()).toHaveLength(1);

    await flow.elb('via flow');
    expect(readLayer()).toHaveLength(1);
  });

  test('the installed writer dispatches behind the run chain', async () => {
    const scope = createScope('<div data-elbuser="id:u1"></div>');
    const flow = await start({ pageview: true, scope });

    await Promise.all([
      getInstalledElb()('order complete'),
      flow.elb('order refund'),
    ]);

    // The layer chain orders the pageview strictly before anything the page
    // pushes through the installed writer. flow.elb bypasses that chain.
    // Presence is asserted before position: indexOf reports -1 for a missing
    // name, and -1 precedes every real index, so an ordering check alone would
    // hold even if an event never arrived.
    const order = names();
    const pageview = order.indexOf('page view');
    const refund = order.indexOf('order refund');
    const complete = order.indexOf('order complete');

    expect(pageview).toBeGreaterThanOrEqual(0);
    expect(refund).toBeGreaterThanOrEqual(0);
    expect(complete).toBeGreaterThanOrEqual(0);

    expect(pageview).toBeLessThan(complete);
    expect(refund).toBeLessThan(complete);
  });

  test('a pre-run event survives the writer and is dropped by flow.elb', async () => {
    const flow = await start({ pageview: false, scope: createScope() }, false);

    expect(await getInstalledElb()('pre a')).toStrictEqual({ ok: true });
    expect(await flow.elb('pre b')).toStrictEqual({ ok: false });
    expect(received).toHaveLength(0);

    await flow.collector.command('run');

    expect(names()).toStrictEqual(['pre a']);
  });
});
