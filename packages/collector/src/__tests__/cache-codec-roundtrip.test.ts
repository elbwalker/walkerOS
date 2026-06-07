import { startFlow } from '..';
import {
  buildCacheContext,
  checkCache,
  compileCache,
  serializeStoreValue,
  deserializeStoreValue,
  storeCache,
  wrapCacheEnvelope,
  readCacheEnvelope,
} from '@walkeros/core';
import { createCacheStore } from '../cache-store';
import type { Store, Transformer, WalkerOS } from '@walkeros/core';

/**
 * Regression sweep for the unified cache envelope discipline. The request
 * cache stores a plain `{value, exp}` envelope (`wrapCacheEnvelope` /
 * `readCacheEnvelope` in `@walkeros/core`); the backing store is responsible
 * for serializing it. There is exactly ONE discipline: the cache no longer
 * pre-serializes to a Buffer.
 *
 * The request-cache has three kinds of callers that store DIFFERENT
 * payloads, all of which must survive a MISS->HIT round-trip:
 *  - transformer.ts storeCache: a processed event object
 *  - destination.ts storeCache: a push result (`SendResponse` shape) or `true`
 *  - source.ts: RespondOptions + the `true` sentinel (covered elsewhere)
 *
 * These tests route the cache through a CODEC store (mirroring a real
 * fs/s3/gcs backing): every value is serialized to bytes via the shared store
 * codec on `set` and restored on `get`, so a HIT is only possible if the
 * envelope genuinely round-trips through serialization. Binary leaves come
 * back as platform-neutral `Uint8Array`, never a Node `Buffer`. The `__cache`
 * (in-memory, by-reference) path is exercised separately below.
 */

interface CodecStoreCounters {
  writes: number;
}

/**
 * A store that serializes every value to bytes via the shared store codec,
 * like the production fs/s3/gcs stores. Forces the cache envelope through a
 * real serialize/deserialize cycle for transformer/destination cache writes.
 */
function createCodecStore(
  data: Map<string, Uint8Array>,
  counters: CodecStoreCounters,
): Store.Init {
  return (context) => ({
    type: 'codec-store',
    config: context.config as Store.Config,
    get: async (key: string) => {
      const raw = data.get(key);
      return raw === undefined ? undefined : deserializeStoreValue(raw);
    },
    set: async (key: string, value: Store.StoreValue) => {
      counters.writes++;
      data.set(key, serializeStoreValue(value));
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  });
}

describe('cache envelope round-trip (request-cache callers)', () => {
  // A. Transformer event-object round-trip through a codec store.
  it('round-trips a processed event object through a codec cache store', async () => {
    const data = new Map<string, Uint8Array>();
    const counters: CodecStoreCounters = { writes: 0 };
    let enricherCalls = 0;
    const destinationEvents: WalkerOS.DeepPartialEvent[] = [];

    // Representative processed event with nested + array + primitive shapes.
    const enrichedEvent: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      data: { id: '/x', count: 3, items: ['a', 'b'] },
      context: { stage: ['checkout', 1] },
      nested: [{ entity: 'product', data: { id: 'p1' } }],
    };

    const { elb } = await startFlow({
      stores: {
        codecCache: { code: createCodecStore(data, counters) },
      },
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push() {
              enricherCalls++;
              return { event: enrichedEvent };
            },
          }),
          cache: {
            store: 'codecCache',
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
      destinations: {
        spy: {
          before: 'enricher',
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.DeepPartialEvent) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    // First push: MISS : enricher runs, processed event serialized to bytes.
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1);
    expect(counters.writes).toBe(1); // envelope serialized to bytes
    expect(destinationEvents).toHaveLength(1);

    // The codec store holds serialized bytes (the envelope), not a raw object.
    const stored = [...data.values()][0];
    expect(stored).toBeInstanceOf(Uint8Array);

    // Second push same name: HIT : enricher skipped, event decoded from bytes.
    destinationEvents.length = 0;
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1); // cached, not re-run

    // Structural round-trip: the decoded event matches the original exactly.
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0]).toEqual(enrichedEvent);
    expect(destinationEvents[0].data).toEqual({
      id: '/x',
      count: 3,
      items: ['a', 'b'],
    });
    expect(destinationEvents[0].context).toEqual({ stage: ['checkout', 1] });
  });

  // B. Destination push-result round-trip through a codec store.
  it('round-trips a destination push result (SendResponse) through a codec cache store', async () => {
    const data = new Map<string, Uint8Array>();
    const counters: CodecStoreCounters = { writes: 0 };
    let pushCount = 0;

    // Canonical SendResponse: { ok, data, error? }. `data` is JSON-safe
    // (matches sendServer, which JSON.parses the response body or keeps the
    // raw string), `error` is always a string. No Date/Error/function.
    const pushResult = { ok: true, data: { id: 'resp-1', items: [1, 2, 3] } };

    const { elb } = await startFlow({
      stores: {
        codecCache: { code: createCodecStore(data, counters) },
      },
      destinations: {
        api: {
          code: {
            type: 'api',
            config: {},
            push: async () => {
              pushCount++;
              return pushResult;
            },
          },
          cache: {
            store: 'codecCache',
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
    });

    // First push: MISS : destination push runs, result serialized to bytes.
    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(1);
    expect(counters.writes).toBe(1); // result serialized

    const stored = [...data.values()][0];
    expect(stored).toBeInstanceOf(Uint8Array);

    // Second push: HIT : push skipped (deduplicated). The cached result is
    // never re-emitted downstream, but it must DECODE without error so the
    // HIT path resolves.
    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(1); // deduplicated via cached result
  });

  // B (codec unit-level): prove a SendResponse round-trips through the public
  // envelope + store codec, including a nested binary leaf in `data` that
  // surfaces back as a Uint8Array (not a Node Buffer).
  it('envelope + codec round-trips a SendResponse with a nested binary leaf in data', () => {
    const result = {
      ok: false,
      data: { raw: new Uint8Array([0x62, 0x6f, 0x64, 0x79]), nested: { n: 1 } },
      error: '500 Internal Server Error',
    };
    const bytes = serializeStoreValue(wrapCacheEnvelope(result, 60_000));
    expect(bytes).toBeInstanceOf(Uint8Array);
    const decoded = readCacheEnvelope(deserializeStoreValue(bytes));
    expect(decoded).toBeDefined();
    if (!decoded || 'expired' in decoded) throw new Error('unexpected decode');
    expect(decoded.value).toEqual(result);
    const value = decoded.value;
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      value instanceof Uint8Array ||
      !('data' in value) ||
      value.data === null ||
      typeof value.data !== 'object' ||
      Array.isArray(value.data) ||
      value.data instanceof Uint8Array ||
      !('raw' in value.data)
    ) {
      throw new Error('decoded shape mismatch');
    }
    expect(value.data.raw).toBeInstanceOf(Uint8Array);
    expect(Buffer.isBuffer(value.data.raw)).toBe(false);
  });

  // C. In-memory `__cache` (default) round-trips a binary body on HIT.
  // The default store keeps the envelope (and its live binary leaf) by
  // reference; `readCacheEnvelope` inside `checkCache` strips the envelope and
  // returns the value verbatim. This mirrors the source.ts caller, which
  // caches RespondOptions whose `body` is binary.
  it('round-trips a RespondOptions binary body through the default in-memory __cache on HIT', async () => {
    const store = createCacheStore();
    const compiled = compileCache({
      rules: [{ key: ['event.name'], ttl: 60 }],
    });
    const context = buildCacheContext({}, { name: 'page view' });

    // Cold: MISS : store does not yet hold the key.
    const miss = await checkCache(compiled, store, context);
    expect(miss?.status).toBe('MISS');
    if (!miss || miss.status !== 'MISS') throw new Error('expected MISS');

    // Cache a RespondOptions-shaped value with a binary body (the source path).
    const respondOptions = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: new Uint8Array(Buffer.from('cached-body-bytes')),
    };
    storeCache(store, miss.key, respondOptions, miss.rule.ttl);

    // The default __cache holds the plain {value, exp} envelope by reference.
    const rawStored = store.get(miss.key);
    expect(Buffer.isBuffer(rawStored)).toBe(false);

    // Warm: HIT : checkCache strips the envelope and returns the value,
    // including the binary body as a Uint8Array.
    const hit = await checkCache(compiled, store, context);
    expect(hit?.status).toBe('HIT');
    if (!hit || hit.status !== 'HIT') throw new Error('expected HIT');

    const value = hit.value;
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      value instanceof Uint8Array ||
      !('body' in value) ||
      !('status' in value)
    ) {
      throw new Error('decoded RespondOptions shape mismatch');
    }
    expect(value.status).toBe(200);
    expect(value.body).toBeInstanceOf(Uint8Array);
    expect(value).toEqual(respondOptions);
  });

  // E. State-to-codec-store: `applyState` writes payloads DIRECTLY through the
  // store's own `set`, which serializes via the store codec. A structured
  // `state[set]` payload persists byte-exact and reads back structurally.
  it('state[set] of a plain object persists through a codec store', async () => {
    const data = new Map<string, Uint8Array>();
    const counters: CodecStoreCounters = { writes: 0 };

    const { elb, collector } = await startFlow({
      stores: {
        codecStore: { code: createCodecStore(data, counters) },
      },
      transformers: {
        writer: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'writer',
            config: ctx.config,
            push(event) {
              return { event };
            },
          }),
          // state[set] writes a plain OBJECT payload straight to the store.
          state: [
            {
              mode: 'set',
              store: 'codecStore',
              key: { value: 'profile' },
              value: { value: { id: 'u-1', roles: ['admin'] } },
            },
          ],
        },
      },
      destinations: {
        spy: {
          before: 'writer',
          code: { type: 'spy', config: {}, push: async () => {} },
        },
      },
    });

    await elb({ name: 'page view', data: { id: 'u-1' } });

    // The codec store serialized and persisted the object payload.
    expect(counters.writes).toBe(1);
    expect(data.size).toBe(1);

    const store = collector.stores.codecStore;
    const stored = await store.get('profile');
    expect(stored).toEqual({ id: 'u-1', roles: ['admin'] });
  });
});
