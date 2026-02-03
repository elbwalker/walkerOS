import { startFlow } from '..';
import type { Transformer, WalkerOS } from '@walkeros/core';

describe('Destination Transformer Chains (destination.before)', () => {
  describe('chain execution', () => {
    it('executes transformer chain before pushing to destination', async () => {
      const transformerCalls: string[] = [];
      const destinationEvents: WalkerOS.Event[] = [];

      const { elb } = await startFlow({
        transformers: {
          enricher: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'enricher',
              config: {},
              push: async (event) => {
                transformerCalls.push('enricher');
                return { ...event, data: { ...event.data, enriched: true } };
              },
            }),
          },
        },
        destinations: {
          testDest: {
            before: 'enricher',
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

      await elb({ name: 'page view', data: { title: 'Test' } });

      // Transformer was called
      expect(transformerCalls).toContain('enricher');

      // Destination received enriched event
      expect(destinationEvents.length).toBe(1);
      expect(destinationEvents[0].data?.enriched).toBe(true);
    });

    it('executes chained transformers via transformer.next', async () => {
      const order: string[] = [];

      const { elb } = await startFlow({
        transformers: {
          first: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'first',
              config: { next: 'second' },
              push: async (event) => {
                order.push('first');
                return event;
              },
            }),
          },
          second: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'second',
              config: { next: 'third' },
              push: async (event) => {
                order.push('second');
                return event;
              },
            }),
          },
          third: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'third',
              config: {},
              push: async (event) => {
                order.push('third');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            before: 'first',
            code: {
              type: 'test',
              config: {},
              push: async () => {},
            },
          },
        },
      });

      await elb({ name: 'page view', data: {} });

      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('stops chain when transformer returns false', async () => {
      const destinationEvents: WalkerOS.Event[] = [];

      const { elb } = await startFlow({
        transformers: {
          filter: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'filter',
              config: {},
              push: async (event) => {
                // Filter out walker commands
                if (event.name?.startsWith('walker ')) return false;
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            before: 'filter',
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

      // This should be filtered
      await elb({ name: 'walker destination', data: {} });
      // This should pass
      await elb({ name: 'page view', data: {} });

      expect(destinationEvents.length).toBe(1);
      expect(destinationEvents[0].name).toBe('page view');
    });

    it('supports array of transformers in before', async () => {
      const order: string[] = [];

      const { elb } = await startFlow({
        transformers: {
          a: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'a',
              config: {},
              push: async (event) => {
                order.push('a');
                return event;
              },
            }),
          },
          b: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'b',
              config: {},
              push: async (event) => {
                order.push('b');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            before: ['a', 'b'],
            code: {
              type: 'test',
              config: {},
              push: async () => {},
            },
          },
        },
      });

      await elb({ name: 'page view', data: {} });

      expect(order).toEqual(['a', 'b']);
    });
  });

  describe('destinations without before', () => {
    it('pushes directly without transformer chain', async () => {
      const destinationEvents: WalkerOS.Event[] = [];

      const { elb } = await startFlow({
        transformers: {
          unused: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'unused',
              config: {},
              push: async () => {
                throw new Error('Should not be called');
              },
            }),
          },
        },
        destinations: {
          testDest: {
            // No before property
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

      await elb({ name: 'page view', data: {} });

      expect(destinationEvents.length).toBe(1);
    });
  });

  describe('dynamic destinations', () => {
    it('respects before on dynamically added destinations', async () => {
      const transformerCalls: string[] = [];

      const { collector, elb } = await startFlow({
        transformers: {
          tracker: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'tracker',
              config: {},
              push: async (event) => {
                transformerCalls.push('tracker');
                return event;
              },
            }),
          },
        },
        destinations: {},
      });

      // Add destination dynamically with before
      await collector.command('destination', {
        code: {
          type: 'dynamic',
          config: {},
          push: async () => {},
        },
        before: 'tracker',
      });

      await elb({ name: 'page view', data: {} });

      expect(transformerCalls).toContain('tracker');
    });
  });

  describe('Bundler-style transformer chains (next at definition level)', () => {
    it('resolves transformer.next from definition level', async () => {
      const order: string[] = [];

      const { elb } = await startFlow({
        transformers: {
          first: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'first',
              config: context.config,
              push: async (event) => {
                order.push('first');
                return event;
              },
            }),
            next: 'second',
          },
          second: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'second',
              config: context.config,
              push: async (event) => {
                order.push('second');
                return event;
              },
            }),
            next: 'third',
          },
          third: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'third',
              config: context.config,
              push: async (event) => {
                order.push('third');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            before: 'first',
            code: {
              type: 'test',
              config: {},
              push: async () => {},
            },
          },
        },
      });

      await elb({ name: 'page view', data: {} });

      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('handles mixed definition and instance-level next', async () => {
      const order: string[] = [];

      const { elb } = await startFlow({
        transformers: {
          first: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'first',
              config: context.config,
              push: async (event) => {
                order.push('first');
                return event;
              },
            }),
            next: 'second',
          },
          second: {
            code: async (): Promise<Transformer.Instance> => ({
              type: 'second',
              config: { next: 'third' },
              push: async (event) => {
                order.push('second');
                return event;
              },
            }),
          },
          third: {
            code: async (context): Promise<Transformer.Instance> => ({
              type: 'third',
              config: context.config,
              push: async (event) => {
                order.push('third');
                return event;
              },
            }),
          },
        },
        destinations: {
          testDest: {
            before: 'first',
            code: {
              type: 'test',
              config: {},
              push: async () => {},
            },
          },
        },
      });

      await elb({ name: 'page view', data: {} });

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });
});
