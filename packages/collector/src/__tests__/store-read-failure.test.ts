import { createMockLogger, Level, StepError } from '@walkeros/core';
import type { Destination, Logger, Store, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';
import { createCacheStore } from '../cache-store';
import { wrapStoreWithCache } from '../store-cache-wrapper';

/** A store whose reads are refused (403), and whose writes are kept. */
function refusing(written: Map<string, Store.StoreValue>): Store.Instance {
  return {
    type: 'refusing',
    config: {},
    get: async () => {
      throw new StepError('HTTP 403', { code: 'transport', status: 403 });
    },
    set: async (key: string, value: Store.StoreValue) => {
      written.set(key, value);
    },
    delete: async () => undefined,
  };
}

function refusingStore(written: Map<string, Store.StoreValue>): Store.Init {
  return () => refusing(written);
}

function errors() {
  const lines: Array<{ message: string; context: Logger.LogContext }> = [];
  const logger: Logger.Config = {
    handler: (level, message, context) => {
      if (level === Level.ERROR) lines.push({ message, context });
    },
  };
  return { lines, logger };
}

function sink(delivered: WalkerOS.Event[]): Destination.Instance {
  return {
    type: 'sink',
    config: {},
    push: async (event) => void delivered.push(event),
  };
}

describe('failed store reads (ruling 10)', () => {
  it('(a) a state get that throws delivers without the enrichment, one ERROR per cause', async () => {
    const { lines, logger } = errors();
    const delivered: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      logger,
      stores: { s: { code: refusingStore(new Map()) } },
      destinations: {
        d: {
          code: sink(delivered),
          state: {
            mode: 'get',
            store: 's',
            key: 'event.name',
            value: 'event.data.enriched',
          },
        },
      },
    });

    const first = await elb('page view', { id: 1 });
    await elb('page view', { id: 2 });

    expect(first.ok).toBe(true);
    expect(delivered).toHaveLength(2);
    expect(delivered[0].data).toEqual({ id: 1 });
    expect(lines).toHaveLength(1);
    expect(lines[0].context).toMatchObject({
      step: 'store.s',
      code: 'transport',
      status: 403,
    });
  });

  it('(b) a step cache backed by that store treats the throw as a miss', async () => {
    const { lines, logger } = errors();
    const delivered: WalkerOS.Event[] = [];
    const { elb } = await startFlow({
      logger,
      stores: { s: { code: refusingStore(new Map()) } },
      destinations: {
        d: {
          code: sink(delivered),
          cache: {
            store: 's',
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
    });

    const r = await elb('page view');
    await elb('page view');

    expect(r.ok).toBe(true);
    expect(delivered).toHaveLength(2);
    expect(lines).toHaveLength(1);
    expect(lines[0].context).toMatchObject({
      step: 'store.s',
      code: 'transport',
      status: 403,
    });
  });

  it('(c) a state merge whose read throws skips its write and reports once', async () => {
    const { lines, logger } = errors();
    const written = new Map<string, Store.StoreValue>();
    const { elb } = await startFlow({
      logger,
      stores: { s: { code: refusingStore(written) } },
      destinations: {
        d: {
          code: sink([]),
          state: {
            mode: 'set',
            store: 's',
            key: 'event.name',
            value: 'event.data',
            mapping: { map: { last: 'id' } },
          },
        },
      },
    });

    await elb('page view', { id: 'a' });
    await elb('page view', { id: 'b' });

    expect(written.size).toBe(0);
    expect(lines).toHaveLength(1);
    expect(lines[0].context).toMatchObject({ step: 'store.s', status: 403 });
  });

  it('(d) the read-through wrapper passes a backing throw on, caches nothing, logs nothing', async () => {
    const logger = createMockLogger();
    const cacheStore = createCacheStore();
    const wrapped = wrapStoreWithCache(refusing(new Map()), {
      storeId: 's',
      cacheConfig: { rules: [{ ttl: 60 }] },
      cacheStore,
      namespace: 's',
      logger,
    });

    await expect(wrapped.get('k')).rejects.toThrow('HTTP 403');
    expect(cacheStore.get('s:k')).toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
