import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { transformerRouter } from '../transformer';
import type { RouterSettings } from '../types';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;

    const context: Transformer.Context<
      Transformer.Types<Partial<RouterSettings>>
    > = {
      collector: {} as Collector.Instance,
      logger: createMockLogger(),
      id: 'router',
      config: {
        settings: {
          routes: [
            {
              match: { key: 'v', operator: 'eq', value: '2' },
              next: 'gtag-parser',
            },
          ],
        },
        init: true,
      },
      env: {},
    };

    const instance = transformerRouter(context) as Transformer.Instance;

    // Router matches on ingest context; use event.data as flat ingest
    const pushContext = {
      ...context,
      ingest: event.data as Record<string, unknown>,
    };
    const result = instance.push(event, pushContext);

    if (example.out === false) {
      // No match returns undefined (passthrough); both are falsy
      expect(result).toBeFalsy();
    } else {
      expect(result).toEqual(example.out);
    }
  });
});
