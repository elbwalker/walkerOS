import { startFlow } from '@walkeros/collector';
import { Source } from '@walkeros/core';
import type { Destination, RespondFn } from '@walkeros/core';
import type { Request, Response } from 'express';
import { sourceExpress } from '../index';
import type { Types as ExpressTypes } from '../types';

/**
 * End-to-end proof for the request-cache round-trip at the express boundary.
 *
 * The production crash: a GET to a cached path (e.g. `/walker.js`) responds
 * with a Buffer body. Storing that structured HTTP response
 * (`{ body: Buffer, headers, status }`) to the byte-backed cache crashed; on
 * the next request it must round-trip and be served from cache with the exact
 * bytes, headers, and status preserved, plus `X-Cache: HIT` applied by the
 * cache `update` rule.
 *
 * Harness mirrors `concurrent-requests.test.ts` (real `startFlow` + a live
 * express source driven through plain-object mock req/res) combined with the
 * `cache` + `update` config shape from the collector's
 * `source-cache-integration.test.ts`.
 */
// Destination env carrying the per-scope `respond` the collector injects into
// each step. Typing it here lets the destination read `ctx.env.respond`
// without a cast.
type ResponderTypes = Destination.Types<
  unknown,
  unknown,
  { respond?: RespondFn }
>;

describe('Express source cache round-trip', () => {
  it('stores a Buffer response on MISS and serves it on HIT with bytes, headers, status intact', async () => {
    const ASSET_BODY = Buffer.from('/* walker.js bundle bytes */', 'utf8');
    const destinationCalls: string[] = [];

    // Destination responds with a Buffer body + Content-Type + status 200.
    // The express GET default (transparent GIF) is idempotent, so this
    // first-call wins and seeds the cache with a structured HTTP response.
    const assetDestination: Destination.Instance<ResponderTypes> = {
      type: 'asset',
      config: {},
      push: async (_event, ctx) => {
        destinationCalls.push('asset');
        ctx.env?.respond?.({
          body: ASSET_BODY,
          status: 200,
          headers: { 'Content-Type': 'application/javascript' },
        });
      },
    };

    const { collector } = await startFlow({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          // No port: drive the handler in-process via the source's `push`.
          config: {
            settings: { paths: ['/walker.js'] },
            ingest: {
              map: {
                method: { key: 'method' },
                path: { key: 'url' },
              },
            },
          },
          cache: {
            stop: true,
            rules: [
              {
                match: { key: 'ingest.method', operator: 'eq', value: 'GET' },
                key: ['ingest.method', 'ingest.path'],
                ttl: 300,
                update: {
                  'headers.X-Cache': { key: 'cache.status' },
                },
              },
            ],
          },
        },
      },
      destinations: {
        asset: { code: assetDestination },
      },
    });

    const expressSource = Source.getSource<ExpressTypes>(collector, 'express');

    type Capture = {
      status: number;
      body: unknown;
      headers: Record<string, string>;
    };

    // `name=page view` gives the pushed event a valid name so it reaches the
    // destination (the GET handler parses the query string into the event via
    // requestToData). The full url is the cache key and is identical across
    // both requests, so the second is a HIT.
    const mockRequest = (): Request =>
      ({
        method: 'GET',
        url: '/walker.js?name=page%20view',
        headers: {},
        get: () => undefined,
        // Express Request/Response are framework interfaces too large to mock
        // structurally; this confined test-double cast is the sanctioned
        // express-harness boundary (cf. concurrent-requests.test.ts).
      }) as unknown as Request;

    const mockResponse = () => {
      const captures: Capture[] = [];
      let status = 200;
      const headers: Record<string, string> = {};
      const res = {
        status: (code: number) => {
          status = code;
          return res;
        },
        set: (key: string, value: string) => {
          headers[key] = value;
          return res;
        },
        send: (body?: unknown) => {
          captures.push({ status, body, headers: { ...headers } });
          return res;
        },
        json: (body: unknown) => {
          captures.push({ status, body, headers: { ...headers } });
          return res;
        },
      };
      // Express Request/Response are framework interfaces too large to mock
      // structurally; this confined test-double cast is the sanctioned
      // express-harness boundary (cf. concurrent-requests.test.ts).
      return { res: res as unknown as Response, captures };
    };

    // Asserts the captured response is the cached asset: a Buffer body equal
    // to the original bytes, status 200, Content-Type preserved.
    const expectAsset = (capture: Capture, xCache: string) => {
      expect(capture.status).toBe(200);
      expect(Buffer.isBuffer(capture.body)).toBe(true);
      if (!Buffer.isBuffer(capture.body))
        throw new Error('body was not a Buffer');
      expect(capture.body.equals(ASSET_BODY)).toBe(true);
      expect(capture.headers['Content-Type']).toBe('application/javascript');
      expect(capture.headers['X-Cache']).toBe(xCache);
    };

    // First request: MISS — pipeline runs, destination responds with the
    // Buffer asset, cache stores the structured response.
    const first = mockResponse();
    await expressSource.push(mockRequest(), first.res);

    expect(destinationCalls).toEqual(['asset']);
    expect(first.captures).toHaveLength(1);
    expectAsset(first.captures[0], 'MISS');

    // Second request: HIT — pipeline skipped, response served from cache.
    // The Buffer body round-trips equal, headers + status preserved, X-Cache
    // flipped to HIT, and the destination is NOT called again.
    const second = mockResponse();
    await expressSource.push(mockRequest(), second.res);

    expect(destinationCalls).toEqual(['asset']); // destination not re-run
    expect(second.captures).toHaveLength(1);
    expectAsset(second.captures[0], 'HIT');
  });

  // Regression lock: two simultaneous MISSes for the same cache key both write
  // without crashing, and a subsequent read returns a coherent HIT. This proves
  // concurrent same-key cache writes are tolerated (last-writer-wins on a
  // byte-backed store) and that the stored value still round-trips intact.
  it('handles concurrent same-key MISSes without crashing and serves a coherent HIT afterwards', async () => {
    const ASSET_BODY = Buffer.from('/* concurrent walker.js bytes */', 'utf8');
    const destinationCalls: string[] = [];

    const assetDestination: Destination.Instance<ResponderTypes> = {
      type: 'asset',
      config: {},
      push: async (_event, ctx) => {
        destinationCalls.push('asset');
        ctx.env?.respond?.({
          body: ASSET_BODY,
          status: 200,
          headers: { 'Content-Type': 'application/javascript' },
        });
      },
    };

    const { collector } = await startFlow({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          config: {
            settings: { paths: ['/walker.js'] },
            ingest: {
              map: {
                method: { key: 'method' },
                path: { key: 'url' },
              },
            },
          },
          cache: {
            stop: true,
            rules: [
              {
                match: { key: 'ingest.method', operator: 'eq', value: 'GET' },
                key: ['ingest.method', 'ingest.path'],
                ttl: 300,
                update: {
                  'headers.X-Cache': { key: 'cache.status' },
                },
              },
            ],
          },
        },
      },
      destinations: {
        asset: { code: assetDestination },
      },
    });

    const expressSource = Source.getSource<ExpressTypes>(collector, 'express');

    type Capture = {
      status: number;
      body: unknown;
      headers: Record<string, string>;
    };

    const mockRequest = (): Request =>
      ({
        method: 'GET',
        url: '/walker.js?name=page%20view',
        headers: {},
        get: () => undefined,
      }) as unknown as Request;

    const mockResponse = () => {
      const captures: Capture[] = [];
      let status = 200;
      const headers: Record<string, string> = {};
      const res = {
        status: (code: number) => {
          status = code;
          return res;
        },
        set: (key: string, value: string) => {
          headers[key] = value;
          return res;
        },
        send: (body?: unknown) => {
          captures.push({ status, body, headers: { ...headers } });
          return res;
        },
        json: (body: unknown) => {
          captures.push({ status, body, headers: { ...headers } });
          return res;
        },
      };
      return { res: res as unknown as Response, captures };
    };

    const expectAsset = (capture: Capture) => {
      expect(capture.status).toBe(200);
      expect(Buffer.isBuffer(capture.body)).toBe(true);
      if (!Buffer.isBuffer(capture.body))
        throw new Error('body was not a Buffer');
      expect(capture.body.equals(ASSET_BODY)).toBe(true);
      expect(capture.headers['Content-Type']).toBe('application/javascript');
    };

    // Two simultaneous MISSes for the same key. Both run the pipeline (the
    // cache is empty when each starts) and both write the structured response.
    // Neither must crash, and both must serve the correct bytes/status.
    const a = mockResponse();
    const b = mockResponse();
    await Promise.all([
      expressSource.push(mockRequest(), a.res),
      expressSource.push(mockRequest(), b.res),
    ]);

    expect(a.captures).toHaveLength(1);
    expect(b.captures).toHaveLength(1);
    expectAsset(a.captures[0]);
    expectAsset(b.captures[0]);

    const missCount = destinationCalls.length;

    // A subsequent read returns a coherent HIT served from the value written by
    // the concurrent writers; the destination is not invoked again.
    const third = mockResponse();
    await expressSource.push(mockRequest(), third.res);

    expect(destinationCalls).toHaveLength(missCount); // no new pipeline run
    expect(third.captures).toHaveLength(1);
    expectAsset(third.captures[0]);
    expect(third.captures[0].headers['X-Cache']).toBe('HIT');
  });

  // A decoded cache value surfaces a binary body as a plain Uint8Array,
  // not a Node Buffer. The respond callback must send it as bytes (res.send),
  // never JSON-stringify it (res.json would corrupt the payload).
  it('sends a Uint8Array body as bytes (res.send), not JSON-stringified', async () => {
    const BODY = new Uint8Array([0xff, 0x00, 0x80, 0x01]);
    const responder: Destination.Instance<ResponderTypes> = {
      type: 'responder',
      config: {},
      push: async (_event, ctx) => {
        ctx.env?.respond?.({
          body: BODY,
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      },
    };

    const { collector } = await startFlow({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          config: {
            settings: { paths: ['/asset'] },
            ingest: {
              map: { method: { key: 'method' }, path: { key: 'url' } },
            },
          },
        },
      },
      destinations: {
        responder: { code: responder },
      },
    });

    const expressSource = Source.getSource<ExpressTypes>(collector, 'express');

    const mockRequest = (): Request =>
      ({
        method: 'GET',
        url: '/asset?name=page%20view',
        headers: {},
        get: () => undefined,
      }) as unknown as Request;

    const calls: { method: 'send' | 'json'; body: unknown; status: number }[] =
      [];
    let status = 200;
    const res = {
      status: (code: number) => {
        status = code;
        return res;
      },
      set: () => res,
      send: (body?: unknown) => {
        calls.push({ method: 'send', body, status });
        return res;
      },
      json: (body: unknown) => {
        calls.push({ method: 'json', body, status });
        return res;
      },
    };

    await expressSource.push(mockRequest(), res as unknown as Response);

    // The binary body is sent via res.send as a Buffer (bytes), not res.json.
    const binarySends = calls.filter((c) => c.method === 'send');
    expect(binarySends).toHaveLength(1);
    const sent = binarySends[0].body;
    expect(Buffer.isBuffer(sent)).toBe(true);
    if (!Buffer.isBuffer(sent)) throw new Error('body was not sent as bytes');
    expect(sent.equals(Buffer.from(BODY))).toBe(true);
    expect(calls.some((c) => c.method === 'json')).toBe(false);
  });
});
