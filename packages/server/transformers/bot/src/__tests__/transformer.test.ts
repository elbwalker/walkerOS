import type { Transformer, WalkerOS } from '@walkeros/core';
import { createIngest, createMockContext } from '@walkeros/core';
import { transformerBot } from '../transformer';
import type { BotSettings } from '../types';

jest.mock('../detect/score', () => {
  const actual = jest.requireActual('../detect/score');
  return { ...actual, computeScore: jest.fn(actual.computeScore) };
});

type Types = Transformer.Types<BotSettings>;

const createInitContext = (config: Partial<Transformer.Config<Types>> = {}) =>
  createMockContext<Types>({ config, id: 'bot' });

const createPushContext = (headers: Record<string, string> = {}) =>
  createMockContext<Types>({
    id: 'bot',
    ingest: { ...createIngest('test'), ...headers },
  });

const baseEvent: WalkerOS.DeepPartialEvent = {
  name: 'page view',
  data: { title: 'Home' },
};

const realChromeUA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

describe('transformerBot', () => {
  test('default config writes score, category and product onto the event', async () => {
    const instance = await transformerBot(createInitContext({}));
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: realChromeUA }),
    );
    expect(result).toMatchObject({
      event: { user: { botScore: 0, botCategory: 'human' } },
    });
  });

  test('a named bot writes its product', async () => {
    const instance = await transformerBot(createInitContext({}));
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)' }),
    );
    expect(result).toMatchObject({
      event: {
        user: { botScore: 90, botCategory: 'ai-crawler', botProduct: 'GPTBot' },
      },
    });
  });

  test('reasons default to pipeline scratch, not the event', async () => {
    const instance = await transformerBot(createInitContext({}));
    const ctx = createPushContext({ userAgent: realChromeUA });
    const result = await instance.push(baseEvent, ctx);
    expect(ctx.ingest).toMatchObject({ bot: { reasons: expect.any(Array) } });
    expect(result).not.toMatchObject({
      event: { user: { botReasons: expect.anything() } },
    });
  });

  test('an unmatched UA writes no product', async () => {
    const instance = await transformerBot(createInitContext({}));
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: realChromeUA }),
    );
    expect(result).not.toMatchObject({
      event: { user: { botProduct: expect.anything() } },
    });
  });

  test('output redirected to ingest.* does not pollute event.user', async () => {
    const instance = await transformerBot(
      createInitContext({
        settings: {
          output: {
            botScore: 'ingest.bot.score',
            botCategory: 'ingest.bot.category',
            botProduct: false,
          },
        },
      }),
    );
    const ctx = createPushContext({
      userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)',
    });
    const result = await instance.push(baseEvent, ctx);
    expect(result).not.toMatchObject({
      event: { user: expect.anything() },
    });
    expect(ctx.ingest).toMatchObject({
      bot: { score: 90, category: 'ai-crawler' },
    });
  });

  test('custom input mapping resolves UA from event.data', async () => {
    const instance = await transformerBot(
      createInitContext({
        settings: { input: { userAgent: 'event.data.ua' } },
      }),
    );
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      data: { ua: 'curl/8.4.0' },
    };
    const result = await instance.push(event, createPushContext({}));
    expect(result).toMatchObject({ event: { user: { botScore: 80 } } });
  });

  test('output false disables a single field', async () => {
    const instance = await transformerBot(
      createInitContext({ settings: { output: { botScore: false } } }),
    );
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)' }),
    );
    expect(result).toMatchObject({
      event: { user: { botCategory: 'ai-crawler' } },
    });
    expect(result).not.toMatchObject({
      event: { user: { botScore: expect.anything() } },
    });
  });

  test('an unwired pipeline writes null rather than leaving an inbound value', async () => {
    const instance = await transformerBot(createInitContext({}));
    const result = await instance.push(
      { ...baseEvent, user: { botScore: 0 } },
      createPushContext({}),
    );
    expect(result).toMatchObject({
      event: { user: { botScore: null, botCategory: 'unknown' } },
    });
  });

  test('settings.context pins the context, enabling its checks', async () => {
    const instance = await transformerBot(
      createInitContext({ settings: { context: 'beacon' } }),
    );
    const ctx = createPushContext({
      userAgent: realChromeUA,
      secFetchDest: 'document',
      secFetchMode: 'navigate',
    });
    const result = await instance.push(baseEvent, ctx);
    expect(result).toMatchObject({
      event: { user: { botScore: 75, botCategory: 'automation' } },
    });
  });

  test('settings.suspiciousAt moves the graded cut', async () => {
    const instance = await transformerBot(
      createInitContext({
        settings: {
          suspiciousAt: 99,
          input: { secChUa: 'ingest.secChUa' },
        },
      }),
    );
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: realChromeUA }),
    );
    expect(result).toMatchObject({
      event: { user: { botScore: 25, botCategory: 'human' } },
    });
  });

  test('declaring an input name unlocks its absence check', async () => {
    const instance = await transformerBot(
      createInitContext({ settings: { input: { secChUa: 'ingest.secChUa' } } }),
    );
    const ctx = createPushContext({ userAgent: realChromeUA });
    await instance.push(baseEvent, ctx);
    expect(ctx.ingest).toMatchObject({
      bot: { reasons: expect.arrayContaining(['ch_missing_on_chromium']) },
    });
  });

  test('an undeclared input name reports itself instead of scoring', async () => {
    const instance = await transformerBot(createInitContext({}));
    const ctx = createPushContext({ userAgent: realChromeUA });
    await instance.push(baseEvent, ctx);
    expect(ctx.ingest).toMatchObject({
      bot: { reasons: expect.arrayContaining(['ch_not_declared']) },
    });
  });

  test('type property is "bot"', async () => {
    const instance = await transformerBot(createInitContext({}));
    expect(instance.type).toBe('bot');
  });

  test('output path "ingest." with empty sub-path does not write an empty key', async () => {
    const instance = await transformerBot(
      createInitContext({
        settings: {
          output: { botScore: 'ingest.' },
        },
      }),
    );
    const ctx = createPushContext({
      userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)',
    });
    await instance.push(baseEvent, ctx);
    expect(Object.keys(ctx.ingest)).not.toContain('');
  });

  test('push resolves every declared input into the signal bag', async () => {
    const { computeScore } = jest.requireMock('../detect/score');
    const instance = await transformerBot(createInitContext({}));
    await instance.push(
      baseEvent,
      createPushContext({
        userAgent: realChromeUA,
        acceptLanguage: 'de-DE',
        acceptEncoding: 'gzip, br',
        secFetchSite: 'cross-site',
        secFetchMode: 'cors',
        secFetchDest: 'empty',
        secChUa: '"Chromium";v="124"',
        secChUaMobile: '?0',
        secChUaPlatform: '"macOS"',
        ip: '203.0.113.7',
        accept: '*/*',
        contentType: 'text/plain;charset=UTF-8',
        referer: 'https://example.com/',
        signatureAgent: '"https://agent.example"',
        method: 'POST',
      }),
    );
    expect(computeScore).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: realChromeUA,
        acceptLanguage: 'de-DE',
        acceptEncoding: 'gzip, br',
        secFetchSite: 'cross-site',
        secFetchMode: 'cors',
        secFetchDest: 'empty',
        secChUa: '"Chromium";v="124"',
        secChUaMobile: '?0',
        secChUaPlatform: '"macOS"',
        ip: '203.0.113.7',
        accept: '*/*',
        contentType: 'text/plain;charset=UTF-8',
        referer: 'https://example.com/',
        signatureAgent: '"https://agent.example"',
        method: 'POST',
      }),
      expect.anything(),
    );
  });
});
