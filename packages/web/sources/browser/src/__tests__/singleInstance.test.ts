import type { Ingest, Source, Collector } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser, __resetInstanceCountForTests } from '../index';
import type { Types } from '../types';

/**
 * Window-scoped single-instance guard.
 *
 * A second/synchronous load of the browser tag on the same page is two
 * separate module instances. The guard must live on the window so the
 * second factory call becomes inert: it must NOT re-adopt
 * `window.elbLayer.push`, re-bind DOM triggers, set `window.elb`, or throw
 * to the host page. This reproduces the production crash where a double
 * load re-ran `initElbLayer` against a foreign/second context.
 */

const elbLayerKey = 'elbLayer';
const elbKey = 'elb';

// Read a window global cast-free; returns unknown for the caller to narrow.
const readWindow = (key: string): unknown => Reflect.get(window, key);

// Read the `.push` member off the current elbLayer object, cast-free.
const readElbLayerPush = (): unknown => {
  const layer = Reflect.get(window, elbLayerKey);
  return layer && typeof layer === 'object'
    ? Reflect.get(layer, 'push')
    : undefined;
};

const clearWindowState = (): void => {
  Reflect.set(window, elbLayerKey, undefined);
  Reflect.set(window, elbKey, undefined);
};

async function buildSource(
  collector: Collector.Instance,
): Promise<Source.Instance<Types>> {
  const env: Source.Env<Types> = {
    push: collector.push,
    command: collector.command,
    elb: collector.sources.elb.push,
    window,
    document,
    logger: createMockLogger(),
  };

  return sourceBrowser({
    collector,
    config: {
      settings: {
        prefix: 'data-elb',
        scope: document,
        pageview: false,
        elb: 'elb',
        elbLayer: 'elbLayer',
      },
    },
    env,
    id: 'test-browser',
    logger: createMockLogger(),
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-browser');
      return body({ ...env, push: env.push, ingest, respond });
    },
  });
}

describe('browser source single-instance per window', () => {
  beforeEach(() => {
    clearWindowState();
    __resetInstanceCountForTests();
  });

  afterEach(() => {
    clearWindowState();
  });

  test('second load on the same window is inert: no elbLayer re-adoption, no throw', async () => {
    const { collector } = await startFlow({ sources: {} });

    // First instance initializes normally and adopts window.elbLayer.push.
    const first = await buildSource(collector);
    await first.init?.();

    const adoptedPush = readElbLayerPush();
    expect(typeof adoptedPush).toBe('function');

    const adoptedElb = readWindow(elbKey);
    expect(typeof adoptedElb).toBe('function');

    // Second load: a fresh module instance would start its counter at 0, so a
    // module-scoped guard would NOT trip. A window-scoped guard must return an
    // inert instance whose init does not touch the window.
    let second: Source.Instance<Types> | undefined;
    await expect(
      (async () => {
        second = await buildSource(collector);
      })(),
    ).resolves.toBeUndefined();

    expect(second).toBeDefined();
    if (!second) throw new Error('second instance not created');

    // Inert init must not re-adopt elbLayer.push nor reset window.elb.
    await expect(second.init?.()).resolves.toBeUndefined();

    const pushAfterSecond = readElbLayerPush();
    expect(pushAfterSecond).toBe(adoptedPush);

    const elbAfterSecond = readWindow(elbKey);
    expect(elbAfterSecond).toBe(adoptedElb);
  });

  test('inert second instance push resolves to a successful result', async () => {
    const { collector } = await startFlow({ sources: {} });

    const first = await buildSource(collector);
    await first.init?.();

    const second = await buildSource(collector);
    const result = await second.push('page view');
    expect(result.ok).toBe(true);
  });

  test('reset clears the window sentinel so a fresh first instance initializes', async () => {
    const { collector } = await startFlow({ sources: {} });

    const first = await buildSource(collector);
    await first.init?.();
    expect(typeof readWindow(elbKey)).toBe('function');

    // Capture the adopted elb identity, then reset ONLY the sentinel (do not
    // clear window.elb). If the sentinel reset is a no-op, the next build is
    // inert and window.elb stays the SAME function. A real reset lets the next
    // build re-adopt and install a fresh window.elb.
    const elbAfterFirst = readWindow(elbKey);
    __resetInstanceCountForTests();

    const fresh = await buildSource(collector);
    await fresh.init?.();

    const elbAfterReset = readWindow(elbKey);
    expect(typeof elbAfterReset).toBe('function');
    // A fresh first instance re-binds window.elb to a new function.
    expect(elbAfterReset).not.toBe(elbAfterFirst);
  });
});
