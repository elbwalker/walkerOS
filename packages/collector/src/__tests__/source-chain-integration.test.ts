import { startFlow } from '..';
import type { Source, Transformer, WalkerOS, Elb } from '@walkeros/core';

describe('Source Transformer Chains (source.next)', () => {
  describe('pre-collector chain execution', () => {
    it('executes transformer chain before collector processes event', async () => {
      const transformerCalls: string[] = [];
      const destinationEvents: WalkerOS.Event[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push as Elb.Fn,
              };
            },
            next: 'enrich',
          },
        },
        transformers: {
          enrich: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'enricher',
              config: context.config,
              push: async (event) => {
                transformerCalls.push('enrich');
                return { ...event, data: { ...event.data, enriched: true } };
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async (event) => {
                destinationEvents.push(event);
              },
            },
          },
        },
      });

      await collector.sources.testSource.push({ name: 'page view', data: {} });

      expect(transformerCalls).toContain('enrich');
      expect(destinationEvents.length).toBe(1);
      expect(destinationEvents[0].data?.enriched).toBe(true);
    });

    it('chains source.next through transformer.next', async () => {
      const order: string[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push as Elb.Fn,
              };
            },
            next: 'validate',
          },
        },
        transformers: {
          validate: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'validator',
              config: context.config,
              push: async (event) => {
                order.push('validate');
                return event;
              },
            }),
            next: 'enrich',
          },
          enrich: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'enricher',
              config: context.config,
              push: async (event) => {
                order.push('enrich');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async () => {
                order.push('destination');
              },
            },
          },
        },
      });

      await collector.sources.testSource.push({ name: 'page view', data: {} });

      expect(order).toEqual(['validate', 'enrich', 'destination']);
    });

    it('stops pre-collector chain when transformer returns false', async () => {
      const destinationEvents: WalkerOS.Event[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push as Elb.Fn,
              };
            },
            next: 'filter',
          },
        },
        transformers: {
          filter: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'filter',
              config: context.config,
              push: async (event) => {
                if (event.name?.startsWith('internal')) return false;
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async (event) => {
                destinationEvents.push(event);
              },
            },
          },
        },
      });

      await collector.sources.testSource.push({
        name: 'internal event',
        data: {},
      });
      await collector.sources.testSource.push({ name: 'page view', data: {} });

      expect(destinationEvents.length).toBe(1);
      expect(destinationEvents[0].name).toBe('page view');
    });

    it('supports array next for explicit chain control', async () => {
      const order: string[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push as Elb.Fn,
              };
            },
            next: ['a', 'b', 'c'],
          },
        },
        transformers: {
          a: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'a',
              config: context.config,
              push: async (event) => {
                order.push('a');
                return event;
              },
            }),
            next: 'ignored',
          },
          b: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'b',
              config: context.config,
              push: async (event) => {
                order.push('b');
                return event;
              },
            }),
          },
          c: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'c',
              config: context.config,
              push: async (event) => {
                order.push('c');
                return event;
              },
            }),
          },
          ignored: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'ignored',
              config: context.config,
              push: async (event) => {
                order.push('ignored');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async () => {},
            },
          },
        },
      });

      await collector.sources.testSource.push({ name: 'page view', data: {} });

      expect(order).toEqual(['a', 'b', 'c']);
      expect(order).not.toContain('ignored');
    });
  });

  describe('source without next', () => {
    it('sends events directly to collector without pre-chain', async () => {
      const transformerCalls: string[] = [];
      const destinationEvents: WalkerOS.Event[] = [];

      const { collector } = await startFlow({
        sources: {
          testSource: {
            code: async (context): Promise<Source.Instance> => {
              const { env, config } = context;
              return {
                type: 'test',
                config: config as Source.Config,
                push: env.push as Elb.Fn,
              };
            },
          },
        },
        transformers: {
          unused: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'unused',
              config: context.config,
              push: async () => {
                transformerCalls.push('unused');
                throw new Error('Should not be called');
              },
            }),
          },
        },
        destinations: {
          testDest: {
            code: {
              type: 'test',
              config: {},
              push: async (event) => {
                destinationEvents.push(event);
              },
            },
          },
        },
      });

      await collector.sources.testSource.push({ name: 'page view', data: {} });

      expect(transformerCalls).toHaveLength(0);
      expect(destinationEvents.length).toBe(1);
    });
  });
});
