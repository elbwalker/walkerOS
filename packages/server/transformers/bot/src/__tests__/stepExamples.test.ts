import type { Transformer, WalkerOS } from '@walkeros/core';
import { createIngest, createMockContext } from '@walkeros/core';
import { transformerBot } from '../transformer';
import type { BotSettings } from '../types';
import * as step from '../examples/step';

type Types = Transformer.Types<BotSettings>;

const realChromeUA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const headersByExample: Record<string, Record<string, string>> = {
  humanChrome: { userAgent: realChromeUA },
  gptBotCrawler: { userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)' },
  chatgptUserAgent: {
    userAgent: 'Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0',
  },
  curlClient: { userAgent: 'curl/8.4.0' },
  missingUA: {}, // intentional: no UA
};

describe('bot transformer step examples', () => {
  const cases = Object.entries(step) as Array<
    [string, (typeof step)[keyof typeof step]]
  >;

  it.each(cases)('%s', async (name, example) => {
    const headers = headersByExample[name] ?? {};
    const ctx = createMockContext<Types>({
      id: 'bot',
      ingest: { ...createIngest('test'), ...headers },
    });
    const instance = await transformerBot(
      createMockContext<Types>({ id: 'bot', config: {} }),
    );
    const result = await instance.push(
      example.in as WalkerOS.DeepPartialEvent,
      ctx,
    );

    // push returns Result | Result[] | false | void; this transformer always
    // returns a single Result. Narrow with a guard instead of casting.
    if (Array.isArray(result) || !result) {
      throw new Error(`expected a single Result for "${name}"`);
    }

    // Wrap to match Flow.StepExample.out shape: [['return', { event: {...} }]]
    const actual = [['return', { event: result.event }]];
    expect(actual).toEqual(example.out);
  });
});
