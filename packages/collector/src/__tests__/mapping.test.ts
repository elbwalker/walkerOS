import type { Destination, Source, WalkerOS, Elb } from '@walkeros/core';
import { startFlow } from '..';

describe('Mapping', () => {
  describe('Source Mapping', () => {
    let spyDestination: jest.Mocked<Destination.Instance>;

    beforeEach(() => {
      spyDestination = {
        type: 'spy',
        config: {},
        push: jest.fn(),
      };
    });

    test('event name override', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      const { collector } = await startFlow({
        sources: {
          test: {
            code: mockSource,
            config: {
              mapping: {
                product: {
                  click: { name: 'product view' },
                },
              },
            },
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push({
        name: 'product click',
        data: { id: 'P123' },
      });

      // Verify destination received renamed event
      expect(spyDestination.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'product view' }),
        expect.any(Object),
      );
    });

    test('ignore rule', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      const { collector } = await startFlow({
        sources: {
          test: {
            code: mockSource,
            config: {
              mapping: {
                internal: {
                  '*': { ignore: true },
                },
              },
            },
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push({ name: 'internal debug', data: {} });

      // Verify destination never received event
      expect(spyDestination.push).not.toHaveBeenCalled();
    });

    // Note: Source data transformation creates context data for destinations,
    // but there's currently no mechanism to pass this through the collector.
    // This would require architectural changes to support properly.

    test('policy enrichment modifies event', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      const { collector } = await startFlow({
        sources: {
          test: {
            code: mockSource,
            config: {
              policy: {
                'data.email': {
                  fn: (event: unknown) =>
                    (
                      (event as WalkerOS.Event).data?.email as string
                    )?.toLowerCase(),
                },
              },
            },
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push({
        name: 'user login',
        data: { email: 'USER@EXAMPLE.COM' },
      });

      // Verify destination received event with normalized email in EVENT data
      expect(spyDestination.push).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'user@example.com' }),
        }),
        expect.any(Object),
      );
    });

    test('consent requirement', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      const { collector } = await startFlow({
        consent: {}, // No consent granted
        sources: {
          test: {
            code: mockSource,
            config: {
              consent: { marketing: true }, // Requires marketing consent
            },
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push('user track');

      // Verify destination never received event (no consent)
      expect(spyDestination.push).not.toHaveBeenCalled();
    });
  });

  describe('Destination Mapping', () => {
    let spyDestination: jest.Mocked<Destination.Instance>;

    beforeEach(() => {
      spyDestination = {
        type: 'spy',
        config: {},
        push: jest.fn(),
      };
    });

    test('event name override', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      spyDestination.config = {
        mapping: {
          product: {
            click: { name: 'product view' },
          },
        },
      };

      const { collector } = await startFlow({
        sources: {
          test: {
            code: mockSource,
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push({
        name: 'product click',
        data: { id: 'P123' },
      });

      // Verify destination received renamed event
      expect(spyDestination.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'product view' }),
        expect.any(Object),
      );
    });

    test('ignore rule', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      spyDestination.config = {
        mapping: {
          internal: {
            '*': { ignore: true },
          },
        },
      };

      const { collector } = await startFlow({
        sources: {
          test: {
            code: mockSource,
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push({ name: 'internal debug', data: {} });

      // Verify destination never received event
      expect(spyDestination.push).not.toHaveBeenCalled();
    });

    test('data transformation', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      spyDestination.config = {
        data: {
          map: {
            category: { value: 'Electronics' },
          },
        },
      };

      const { collector } = await startFlow({
        sources: {
          test: {
            code: mockSource,
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push({
        name: 'product view',
        data: { id: 'P123', name: 'Laptop' },
      });

      // Verify destination received event with transformed data
      expect(spyDestination.push).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          data: { category: 'Electronics' },
        }),
      );
    });

    test('global data transformation', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      spyDestination.config = {
        data: {
          value: 'destination-metadata',
        },
      };

      const { collector } = await startFlow({
        sources: {
          test: {
            code: mockSource,
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push({
        name: 'product view',
        data: { id: 'P123', name: 'Laptop' },
      });

      // Verify destination received transformed data in context
      expect(spyDestination.push).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          data: 'destination-metadata',
        }),
      );
    });

    test('consent requirement', async () => {
      const mockSource = jest.fn(
        (context: Source.Context): Source.Instance => ({
          type: 'test',
          config: context.config,
          push: context.env.push as Elb.Fn,
        }),
      );

      spyDestination.config = {
        consent: { marketing: true }, // Requires marketing consent
      };

      const { collector } = await startFlow({
        consent: {}, // No consent granted
        sources: {
          test: {
            code: mockSource,
          },
        },
        destinations: {
          spy: {
            code: spyDestination,
          },
        },
      });

      // Trigger source push
      await collector.sources.test.push('user track');

      // Verify destination never received event (no consent)
      expect(spyDestination.push).not.toHaveBeenCalled();
    });
  });
});
