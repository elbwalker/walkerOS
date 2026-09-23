import { startFlow } from '@walkeros/collector';
import type { Collector, Destination, Transformer } from '@walkeros/core';
import { sourceExpress } from '../index';
import type { ExpressSource, Settings } from '../types';

/**
 * text/plain bodies at the express boundary, end to end through a real
 * collector and a live server. The single sendBeacon event case lives in
 * index.test.ts ("raw body support").
 *
 * Browsers send two kinds of text/plain POST: navigator.sendBeacon with a
 * JSON payload, and GA4 gtag batches of newline-separated URL-encoded hit
 * lines. The first must keep arriving as the parsed event; the second must
 * reach `ingest.body` as the raw string so a `source.before` decoder can turn
 * it into events.
 */

// Three GA4 hits in one gtag batch, one URL-encoded parameter line per event.
const GA4_BATCH = [
  'en=page_view&dt=Home',
  'en=add_to_cart&pr1=idSKU1~nmShirt',
  'en=scroll&epn.percent_scrolled=90',
].join('\n');

interface Harness {
  url: string;
  collector: Collector.Instance;
  received: string[];
  ingestBodies: unknown[];
  close: () => Promise<void>;
}

/**
 * Structural read of the express-specific server off the generic instance
 * the collector keeps, without a cast.
 */
function serverOf(
  source: Collector.Instance['sources'][string] | undefined,
): ExpressSource['server'] | undefined {
  if (!source) return undefined;
  const candidate: { type: string; server?: ExpressSource['server'] } = source;
  return candidate.server;
}

async function startHarness(
  options: { decoder?: boolean; async?: boolean } = {},
): Promise<Harness> {
  const received: string[] = [];
  const ingestBodies: unknown[] = [];

  const destination: Destination.Instance = {
    type: 'capture',
    config: {},
    push: async (event) => {
      received.push(event.name);
    },
  };

  // Stand-in for a request decoder such as @walkeros/transformer-ga4: reads
  // the raw body from ingest and emits one event per non-empty line, named
  // after its `en` parameter.
  const decoder: Transformer.Init = async (context) => ({
    type: 'line-decoder',
    config: context.config,
    push: async (_event, ctx) => {
      const body = ctx.ingest.body;
      ingestBodies.push(body);
      if (typeof body !== 'string') return false;
      return body
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => ({
          event: {
            name: `ga4 ${new URLSearchParams(line).get('en') ?? 'unknown'}`,
          },
        }));
    },
  });

  const settings: Partial<Settings> = { port: 0, paths: ['/g/collect'] };
  const { collector } = await startFlow({
    consent: { functional: true },
    sources: {
      express: {
        code: sourceExpress,
        config: {
          settings,
          ...(options.async === undefined ? {} : { async: options.async }),
          ingest: {
            map: {
              url: { key: 'url' },
              body: { key: 'body' },
            },
          },
        },
        ...(options.decoder ? { before: 'decoder' } : {}),
      },
    },
    ...(options.decoder
      ? { transformers: { decoder: { code: decoder } } }
      : {}),
    destinations: { capture: { code: destination } },
  });

  const server = serverOf(collector.sources.express);
  if (!server) throw new Error('express source did not start a server');
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once('listening', resolve));
  }
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server did not bind');
  }

  return {
    url: `http://127.0.0.1:${address.port}/g/collect`,
    collector,
    received,
    ingestBodies,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** Poll until the respond-first delivery settles or the budget runs out. */
async function settle(check: () => boolean): Promise<void> {
  for (let i = 0; i < 50 && !check(); i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('express text/plain bodies', () => {
  it('hands a batched GA4 text body to ingest.body as the raw string and decodes N events', async () => {
    const harness = await startHarness({ decoder: true, async: false });
    try {
      const response = await fetch(`${harness.url}?v=2&tid=G-TEST&cid=1.2`, {
        method: 'POST',
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: GA4_BATCH,
      });

      expect(response.status).toBe(200);
      expect(harness.ingestBodies).toEqual([GA4_BATCH]);
      expect(harness.received).toEqual([
        'ga4 page_view',
        'ga4 add_to_cart',
        'ga4 scroll',
      ]);
    } finally {
      await harness.close();
    }
  });

  it('keeps parsing a sendBeacon JSON batch sent as text/plain', async () => {
    const harness = await startHarness({ async: false });
    try {
      const response = await fetch(harness.url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: JSON.stringify([{ name: 'page view' }, { name: 'product add' }]),
      });

      expect(response.status).toBe(200);
      expect(harness.received).toEqual(['page view', 'product add']);
    } finally {
      await harness.close();
    }
  });

  it('rejects undecoded raw text as invalid input without creating an event (sync)', async () => {
    const harness = await startHarness({ async: false });
    try {
      const response = await fetch(harness.url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: GA4_BATCH,
      });

      expect(response.status).toBe(400);
      const body: { success: boolean } = await response.json();
      expect(body.success).toBe(false);
      expect(harness.received).toEqual([]);
      expect(harness.collector.status.sources.express?.rejected).toBe(1);
    } finally {
      await harness.close();
    }
  });

  it('acks undecoded raw text in respond-first mode but delivers nothing', async () => {
    const harness = await startHarness();
    try {
      const response = await fetch(harness.url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'not json either',
      });

      expect(response.status).toBe(200);
      await settle(
        () => harness.collector.status.sources.express?.rejected === 1,
      );
      expect(harness.collector.status.sources.express?.rejected).toBe(1);
      expect(harness.received).toEqual([]);
    } finally {
      await harness.close();
    }
  });

  it('still rejects malformed JSON sent as application/json with 400', async () => {
    const harness = await startHarness({ decoder: true });
    try {
      const response = await fetch(harness.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: GA4_BATCH,
      });

      expect(response.status).toBe(400);
      expect(harness.ingestBodies).toEqual([]);
      expect(harness.received).toEqual([]);
    } finally {
      await harness.close();
    }
  });

  it('rejects a text body over the 1mb limit with 413', async () => {
    const harness = await startHarness({ decoder: true });
    try {
      const response = await fetch(harness.url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: `en=page_view&dt=${'x'.repeat(1024 * 1024)}`,
      });

      expect(response.status).toBe(413);
      expect(harness.ingestBodies).toEqual([]);
    } finally {
      await harness.close();
    }
  });
});
