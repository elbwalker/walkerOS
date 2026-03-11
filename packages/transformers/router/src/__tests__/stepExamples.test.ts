import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { transformerRouter } from '../transformer';
import type { RouterSettings, Route } from '../types';
import { examples } from '../dev';

describe('Step Examples', () => {
  // Per-example route overrides for examples that need wildcard/fallback routes
  const routeOverrides: Record<string, Route[]> = {
    wildcardFallback: [
      { match: { key: 'v', operator: 'eq', value: '2' }, next: 'gtag-parser' },
      { match: '*', next: 'default-handler' },
    ],
  };

  const defaultRoutes: Route[] = [
    { match: { key: 'v', operator: 'eq', value: '2' }, next: 'gtag-parser' },
  ];

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const routes = routeOverrides[name] || defaultRoutes;

    const context: Transformer.Context<
      Transformer.Types<Partial<RouterSettings>>
    > = {
      collector: {} as Collector.Instance,
      logger: createMockLogger(),
      id: 'router',
      config: {
        settings: { routes },
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
