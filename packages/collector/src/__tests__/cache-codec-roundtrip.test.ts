import { startFlow } from '..';
import {
  buildCacheContext,
  checkCache,
  compileCache,
  decodeCacheValue,
  encodeCacheValue,
  storeCache,
} from '@walkeros/core';
import { createCacheStore } from '../cache-store';
import type { Store, Transformer, WalkerOS } from '@walkeros/core';

/**
 * Regression sweep for the cache-boundary serialization codec
 * (`encodeCacheValue` / `decodeCacheValue` in `@walkeros/core`).
 *
 * The request-cache has three kinds of callers that store DIFFERENT
 * payloads — all must survive a MISS→HIT round-trip:
 *  - transformer.ts storeCache: a processed event object
 *  - destination.ts storeCache: a push result (`SendResponse` shape) or `true`
 *  - source.ts: RespondOptions + the `true` sentinel (covered elsewhere)
 *
 * These tests route the cache through a BYTE-ONLY store (mirroring the fs
 * store's `set` guard: Buffer or string only) so a HIT is only possible if
 * the codec genuinely serialized the value to bytes and decoded it back.
 * A plain Map store would pass even without the codec, so it would not
 * prove serialization. The `__cache` (in-memory, by-reference) path is
 * exercised separately below.
 */

interface ByteStoreCounters {
  rejected: number;
}

/**
 * A store that persists ONLY Buffer or string values, like the production
 * fs/s3/gcs stores. Any other `set` payload throws — this is what forces
 * the cache codec to do real serialization for transformer/destination
 * cache writes.
 */
function createByteStore(
  data: Map<string, unknown>,
  counters: ByteStoreCounters,
): Store.Init {
  return (context) => ({
    type: 'byte-only',
    config: context.config as Store.Config,
    get: async (key: string) => data.get(key),
    set: async (key: string, value: unknown) => {
      if (!Buffer.isBuffer(value) && typeof value !== 'string') {
        counters.rejected++;
        throw new Error(
          `byte store persists Buffer or string values only, received ${typeof value}`,
        );
      }
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  });
}

describe('cache codec round-trip (request-cache callers)', () => {
  // A. Transformer event-object round-trip through a byte-only store.
  it('round-trips a processed event object through a byte-only cache store', async () => {
    const data = new Map<string, unknown>();
    const counters: ByteStoreCounters = { rejected: 0 };
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
        byteCache: { code: createByteStore(data, counters) },
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
            store: 'byteCache',
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

    // First push: MISS — enricher runs, processed event is encoded to bytes.
    await elb({ name: 'page view', data: {} });
    expect(enricherCalls).toBe(1);
    expect(counters.rejected).toBe(0); // codec produced a Buffer, store accepted it
    expect(destinationEvents).toHaveLength(1);

    // The byte store now holds a Buffer (the encoded envelope), not a raw object.
    const stored = [...data.values()][0];
    expect(Buffer.isBuffer(stored)).toBe(true);

    // Second push same name: HIT — enricher skipped, event decoded from bytes.
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

  // B. Destination push-result round-trip through a byte-only store.
  it('round-trips a destination push result (SendResponse) through a byte-only cache store', async () => {
    const data = new Map<string, unknown>();
    const counters: ByteStoreCounters = { rejected: 0 };
    let pushCount = 0;

    // Canonical SendResponse: { ok, data, error? }. `data` is JSON-safe
    // (matches sendServer, which JSON.parses the response body or keeps the
    // raw string), `error` is always a string. No Date/Error/function.
    const pushResult = { ok: true, data: { id: 'resp-1', items: [1, 2, 3] } };

    const { elb } = await startFlow({
      stores: {
        byteCache: { code: createByteStore(data, counters) },
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
            store: 'byteCache',
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
    });

    // First push: MISS — destination push runs, result encoded to bytes.
    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(1);
    expect(counters.rejected).toBe(0); // result serialized to a Buffer

    const stored = [...data.values()][0];
    expect(Buffer.isBuffer(stored)).toBe(true);

    // Second push: HIT — push skipped (deduplicated). The cached result is
    // never re-emitted downstream, but it must DECODE without error so the
    // HIT path resolves. We assert the stored bytes decode back to the
    // original push result structurally.
    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(1); // deduplicated via cached result
  });

  // B (codec unit-level): prove a SendResponse round-trips byte-for-byte
  // through the public codec, including a nested Buffer in `data`.
  it('codec round-trips a SendResponse with a nested Buffer in data', () => {
    const result = {
      ok: false,
      data: { raw: Buffer.from('body-bytes'), nested: { n: 1 } },
      error: '500 Internal Server Error',
    };
    const encoded = encodeCacheValue(result, 60_000);
    expect(Buffer.isBuffer(encoded)).toBe(true);
    const decoded = decodeCacheValue(encoded);
    expect(decoded).toBeDefined();
    if (!decoded || 'expired' in decoded) throw new Error('unexpected decode');
    expect(decoded.value).toEqual(result);
    const value = decoded.value;
    if (
      value === null ||
      typeof value !== 'object' ||
      !('data' in value) ||
      value.data === null ||
      typeof value.data !== 'object' ||
      !('raw' in value.data)
    ) {
      throw new Error('decoded shape mismatch');
    }
    expect(Buffer.isBuffer(value.data.raw)).toBe(true);
  });

  // C. In-memory `__cache` (default) round-trips a Buffer body on HIT.
  // The default store keeps the encoded Buffer by reference; `decodeCacheValue`
  // inside `checkCache` restores the original Buffer body. This mirrors the
  // source.ts caller, which caches RespondOptions whose `body` is a Buffer.
  it('round-trips a RespondOptions Buffer body through the default in-memory __cache on HIT', async () => {
    const store = createCacheStore();
    const compiled = compileCache({
      rules: [{ key: ['event.name'], ttl: 60 }],
    });
    const context = buildCacheContext({}, { name: 'page view' });

    // Cold: MISS — store does not yet hold the key.
    const miss = await checkCache(compiled, store, context);
    expect(miss?.status).toBe('MISS');
    if (!miss || miss.status !== 'MISS') throw new Error('expected MISS');

    // Cache a RespondOptions-shaped value with a Buffer body (the source path).
    const respondOptions = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from('cached-body-bytes'),
    };
    storeCache(store, miss.key, respondOptions, miss.rule.ttl);

    // The default __cache holds the encoded envelope Buffer by reference.
    const rawStored = store.get(miss.key);
    expect(Buffer.isBuffer(rawStored)).toBe(true);

    // Warm: HIT — checkCache decodes the envelope and restores the structure,
    // including the Buffer body as a real Buffer (not a base64 string).
    const hit = await checkCache(compiled, store, context);
    expect(hit?.status).toBe('HIT');
    if (!hit || hit.status !== 'HIT') throw new Error('expected HIT');

    const value = hit.value;
    if (
      value === null ||
      typeof value !== 'object' ||
      !('body' in value) ||
      !('status' in value)
    ) {
      throw new Error('decoded RespondOptions shape mismatch');
    }
    expect(value.status).toBe(200);
    expect(Buffer.isBuffer(value.body)).toBe(true);
    if (!Buffer.isBuffer(value.body)) throw new Error('body not a Buffer');
    expect(value.body.toString()).toBe('cached-body-bytes');
    expect(value).toEqual(respondOptions);
  });

  // E. State-to-byte-store limitation: `applyState` writes payloads DIRECTLY
  // (no codec), so a `state[set]` of a plain object to a byte-only store
  // throws at the store and the fail-open state handler swallows it. The
  // object is NOT persisted. This documents that fs/s3/gcs persist
  // Buffer/string only; structured state payloads need an object-capable
  // store like the default in-memory `__cache`.
  it('state[set] of a plain object to a byte-only store is rejected (codec bypassed)', async () => {
    const data = new Map<string, unknown>();
    const counters: ByteStoreCounters = { rejected: 0 };

    const { elb } = await startFlow({
      stores: {
        byteStore: { code: createByteStore(data, counters) },
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
              store: 'byteStore',
              key: { value: 'profile' },
              value: { map: { id: 'event.data.id' } },
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

    // The byte store rejected the object payload (no codec on the state path)
    // and nothing was persisted; the failure was fail-open (no throw to caller).
    expect(counters.rejected).toBe(1);
    expect(data.size).toBe(0);
  });
});
