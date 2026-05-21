import type { Transformer, WalkerOS } from '@walkeros/core';
import {
  createIngest,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { transformerGa4 } from '../transformer';
import type { GA4Settings } from '../types';

type GA4Types = Transformer.Types<GA4Settings>;

interface MakeContextOpts {
  settings?: GA4Settings;
  url?: string;
  body?: string;
  logger?: ReturnType<typeof createMockLogger>;
}

function makeContext(opts: MakeContextOpts = {}) {
  const logger = opts.logger ?? createMockLogger();
  return createMockContext<GA4Types>({
    config: opts.settings ? { settings: opts.settings } : {},
    logger,
    ingest: {
      ...createIngest('test'),
      ...(opts.url !== undefined ? { url: opts.url } : {}),
      ...(opts.body !== undefined ? { body: opts.body } : {}),
    },
  });
}

const emptyEvent: WalkerOS.DeepPartialEvent = {};

describe('transformerGa4', () => {
  describe('Task 22 — Init + push', () => {
    it('decodes a GA4 hit delivered via context.ingest', async () => {
      const ctx = makeContext({
        url: 'https://www.google-analytics.com/g/collect?v=2&tid=G-XXX&cid=111.222&sid=1700000000&dl=https%3A%2F%2Fx&dt=Home&en=page_view',
      });
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);

      expect(result).toEqual({
        event: expect.objectContaining({ name: 'page view' }),
      });
    });

    it('returns false when ingest has no url', async () => {
      const ctx = makeContext({});
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);
      expect(result).toBe(false);
    });

    it('returns false when ingest.url is not a string', async () => {
      const ctx = createMockContext<GA4Types>({
        config: {},
        ingest: { ...createIngest('test'), url: 123 },
      });
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);
      expect(result).toBe(false);
    });

    it('fan-outs multiple events as array of Results', async () => {
      // POST body with two events (newline separated)
      const ctx = makeContext({
        url: 'https://www.google-analytics.com/g/collect?v=2&tid=G-XXX',
        body: [
          'en=page_view&dl=https%3A%2F%2Fa&dt=A',
          'en=page_view&dl=https%3A%2F%2Fb&dt=B',
        ].join('\n'),
      });
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);
      expect(Array.isArray(result)).toBe(true);
      const arr = result as Transformer.Result[];
      expect(arr).toHaveLength(2);
      expect(arr[0]).toEqual({
        event: expect.objectContaining({ name: 'page view' }),
      });
      expect(arr[1]).toEqual({
        event: expect.objectContaining({ name: 'page view' }),
      });
    });
  });

  describe('Task 23 — tidPattern string → RegExp', () => {
    it('respects user tidPattern (string)', async () => {
      const ctx = makeContext({
        settings: { tidPattern: '^G-CUSTOM' },
        url: 'https://x/g/collect?v=2&tid=G-DEFAULT&en=page_view&dl=https%3A%2F%2Fx',
      });
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);
      expect(result).toBe(false);
    });

    it('accepts custom-prefixed tids when pattern allows', async () => {
      const ctx = makeContext({
        settings: { tidPattern: '^G-CUSTOM' },
        url: 'https://x/g/collect?v=2&tid=G-CUSTOM-1&en=page_view&dl=https%3A%2F%2Fx',
      });
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);
      expect(result).toEqual({
        event: expect.objectContaining({ name: 'page view' }),
      });
    });

    it('default tidPattern drops AW- traffic', async () => {
      const ctx = makeContext({
        url: 'https://x/g/collect?v=2&tid=AW-12345&en=page_view&dl=https%3A%2F%2Fx',
      });
      const instance = await transformerGa4(ctx);
      expect(await instance.push(emptyEvent, ctx)).toBe(false);
    });

    it('default tidPattern drops DC- traffic', async () => {
      const ctx = makeContext({
        url: 'https://x/g/collect?v=2&tid=DC-12345&en=page_view&dl=https%3A%2F%2Fx',
      });
      const instance = await transformerGa4(ctx);
      expect(await instance.push(emptyEvent, ctx)).toBe(false);
    });
  });

  describe('Task 24 — User-override merge + ignore semantics', () => {
    it('user mapping replaces individual default keys while keeping others', async () => {
      const ctx = makeContext({
        settings: {
          mapping: {
            page_view: {
              name: 'page open',
              data: { map: { id: 'hit.dl' } },
            },
          },
        },
        url: 'https://x/g/collect?v=2&tid=G-X&dl=https%3A%2F%2Fy&dt=Y&en=page_view',
      });
      const overridden = await (
        await transformerGa4(ctx)
      ).push(emptyEvent, ctx);
      expect(overridden).toEqual({
        event: expect.objectContaining({
          name: 'page open',
          data: expect.objectContaining({ id: 'https://y' }),
        }),
      });

      // purchase still default
      const ctx2 = makeContext({
        settings: { mapping: { page_view: { name: 'x' } } },
        url: 'https://x/g/collect?v=2&tid=G-X&en=purchase&ep.transaction_id=T-1&epn.value=10',
      });
      const stillDefault = await (
        await transformerGa4(ctx2)
      ).push(emptyEvent, ctx2);
      expect(stillDefault).toEqual({
        event: expect.objectContaining({ name: 'order complete' }),
      });
    });

    it('ignore: true drops the event', async () => {
      const ctx = makeContext({
        settings: { mapping: { page_view: { ignore: true } } },
        url: 'https://x/g/collect?v=2&tid=G-X&en=page_view&dl=https%3A%2F%2Fx',
      });
      expect(await (await transformerGa4(ctx)).push(emptyEvent, ctx)).toBe(
        false,
      );
    });
  });

  describe('Task 25 — Logging via context.logger.*', () => {
    it('logs successful decode with event count', async () => {
      const logger = createMockLogger();
      const ctx = makeContext({
        logger,
        url: 'https://x/g/collect?en=page_view&v=2&tid=G-X&dl=https%3A%2F%2Fx',
      });
      await (await transformerGa4(ctx)).push(emptyEvent, ctx);
      const debugCalls = logger.debug.mock.calls.map((args) => String(args[0]));
      expect(debugCalls.some((m) => m.includes('decoded'))).toBe(true);
    });

    it('logs debug when tid is dropped by pattern', async () => {
      const logger = createMockLogger();
      const ctx = makeContext({
        logger,
        url: 'https://x/g/collect?v=2&tid=AW-12345&en=page_view&dl=https%3A%2F%2Fx',
      });
      await (await transformerGa4(ctx)).push(emptyEvent, ctx);
      const debugCalls = logger.debug.mock.calls.map((args) => String(args[0]));
      expect(debugCalls.some((m) => m.includes('dropped by tidPattern'))).toBe(
        true,
      );
    });

    it('logs debug when no request is present in ingest', async () => {
      const logger = createMockLogger();
      const ctx = makeContext({ logger });
      await (await transformerGa4(ctx)).push(emptyEvent, ctx);
      const debugCalls = logger.debug.mock.calls.map((args) => String(args[0]));
      expect(debugCalls.some((m) => m.includes('no request in ingest'))).toBe(
        true,
      );
    });
  });

  describe('Task 26 — try/catch around parseRequest', () => {
    it('drops on malformed URI in URL without crashing', async () => {
      // URLSearchParams is lenient about bare `%`; this exercises the
      // resilient path: parse succeeds, no `en`, no events mapped, drop.
      const ctx = makeContext({
        url: 'https://x/g/collect?dl=%',
      });
      expect(await (await transformerGa4(ctx)).push(emptyEvent, ctx)).toBe(
        false,
      );
    });

    it('catches and logs unexpected parser throws', async () => {
      // Force a throw from inside `push` by making `ctx.ingest.url` lookup
      // throw at access time. The try/catch wraps `parseRequest` and the
      // hit-derived steps, but `readGA4Request` runs first and accesses
      // `ingest.url`. So instead, supply a string url and break the regex
      // by making `tidPattern.test` throw — we do that by giving a tid that
      // is a non-string-coercible value via a doctored parse path.
      //
      // Simplest robust trigger: monkey-patch the prototype temporarily so
      // `URLSearchParams.prototype.forEach` throws. This is the closest we
      // can get to a parser failure without mocking module internals.
      const original = URLSearchParams.prototype.forEach;
      URLSearchParams.prototype.forEach = function () {
        throw new Error('boom');
      };
      try {
        const logger = createMockLogger();
        const ctx = makeContext({
          logger,
          url: 'https://x/g/collect?v=2&tid=G-X&en=page_view',
        });
        const result = await (await transformerGa4(ctx)).push(emptyEvent, ctx);
        expect(result).toBe(false);
        const errors = logger.error.mock.calls.map((args) => String(args[0]));
        expect(errors.some((e) => e.includes('parse error'))).toBe(true);
        expect(errors.some((e) => e.includes('boom'))).toBe(true);
      } finally {
        URLSearchParams.prototype.forEach = original;
      }
    });
  });

  describe('Task 27 — Integration with createMockContext', () => {
    it('composes cleanly with canonical createMockContext helper', async () => {
      const logger = createMockLogger();
      const ctx = createMockContext<GA4Types>({
        config: {},
        logger,
        ingest: {
          ...createIngest('source-id'),
          url: 'https://www.google-analytics.com/g/collect?v=2&tid=G-INT&cid=1.2&en=purchase&ep.transaction_id=T-99&epn.value=42&ep.currency=EUR',
        },
      });

      const instance = await transformerGa4(ctx);
      expect(instance.type).toBe('ga4');
      expect(instance.config).toBe(ctx.config);

      const result = await instance.push(emptyEvent, ctx);
      expect(result).toEqual({
        event: expect.objectContaining({
          name: 'order complete',
          data: expect.objectContaining({
            id: 'T-99',
            total: 42,
            currency: 'EUR',
          }),
        }),
      });
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('mapping extend/remove', () => {
    it('extend adds a new data.map field while inheriting the default fields', async () => {
      const ctx = makeContext({
        settings: {
          mapping: {
            purchase: {
              extend: {
                data: { map: { affiliation: 'params.ep.affiliation' } },
              },
            },
          },
        },
        url: 'https://x/g/collect?v=2&tid=G-X&en=purchase&ep.transaction_id=T-1&epn.value=10&ep.currency=EUR&ep.affiliation=partner-1',
      });
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);
      expect(result).toEqual({
        event: expect.objectContaining({
          data: expect.objectContaining({
            id: 'T-1',
            currency: 'EUR',
            total: 10,
            affiliation: 'partner-1',
          }),
        }),
      });
    });

    it('remove strips a field from the produced data', async () => {
      const ctx = makeContext({
        settings: {
          mapping: { purchase: { remove: ['currency'] } },
        },
        url: 'https://x/g/collect?v=2&tid=G-X&en=purchase&ep.transaction_id=T-1&epn.value=10&ep.currency=EUR',
      });
      const instance = await transformerGa4(ctx);
      const result = await instance.push(emptyEvent, ctx);
      expect(result).toEqual({
        event: expect.objectContaining({
          data: expect.objectContaining({ id: 'T-1', total: 10 }),
        }),
      });
      const event = (result as { event: WalkerOS.DeepPartialEvent }).event;
      expect(event.data).not.toHaveProperty('currency');
    });
  });
});
