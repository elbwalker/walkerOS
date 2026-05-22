import type { Transformer, WalkerOS } from '@walkeros/core';
import { createIngest, createMockContext } from '@walkeros/core';
import { transformerBot } from '../transformer';
import type { BotSettings } from '../types';

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
  test('default config writes user.botScore + user.agentScore (real Chrome → 0/0)', async () => {
    const instance = await transformerBot(createInitContext({}));
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: realChromeUA }),
    );
    expect(result).toMatchObject({
      event: { user: { botScore: 0, agentScore: 0 } },
    });
  });

  test('GPTBot UA → 95/95', async () => {
    const instance = await transformerBot(createInitContext({}));
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)' }),
    );
    expect(result).toMatchObject({
      event: { user: { botScore: 95, agentScore: 95 } },
    });
  });

  test('outputAgentProduct off by default — no agentProduct on event', async () => {
    const instance = await transformerBot(createInitContext({}));
    const result = await instance.push(
      baseEvent,
      createPushContext({
        userAgent: 'Mozilla/5.0 (compatible; ChatGPT-User/1.0)',
      }),
    );
    expect(result).not.toMatchObject({
      event: { user: { agentProduct: expect.anything() } },
    });
  });

  test('outputAgentProduct enabled writes user.agentProduct', async () => {
    const instance = await transformerBot(
      createInitContext({
        settings: { output: { agentProduct: 'user.agentProduct' } },
      }),
    );
    const result = await instance.push(
      baseEvent,
      createPushContext({
        userAgent: 'Mozilla/5.0 (compatible; ChatGPT-User/1.0)',
      }),
    );
    expect(result).toMatchObject({
      event: { user: { agentProduct: 'ChatGPT-User' } },
    });
  });

  test('output redirected to ingest.* does not pollute event.user', async () => {
    const instance = await transformerBot(
      createInitContext({
        settings: {
          output: {
            botScore: 'ingest.bot.score',
            agentScore: 'ingest.bot.agent',
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
    expect(ctx.ingest).toMatchObject({ bot: { score: 95, agent: 95 } });
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

  test('omitting outputBot in settings skips writing botScore', async () => {
    const instance = await transformerBot(
      createInitContext({
        settings: { output: { botScore: '', agentScore: 'user.agentScore' } },
      }),
    );
    const result = await instance.push(
      baseEvent,
      createPushContext({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)' }),
    );
    expect(result).toMatchObject({ event: { user: { agentScore: 95 } } });
    expect(result).not.toMatchObject({
      event: { user: { botScore: expect.anything() } },
    });
  });

  test('type property is "bot"', async () => {
    const instance = await transformerBot(createInitContext({}));
    expect(instance.type).toBe('bot');
  });
});
