import { startFlow } from '..';
import type { Source, Transformer, Elb, Ingest } from '@walkeros/core';

describe('transformer mock', () => {
  it('returns global mock value instead of executing transformer', async () => {
    const destPush = jest.fn();
    const transformerPush = jest.fn(() => {
      throw new Error('should not be called');
    });

    const { elb } = await startFlow({
      destinations: {
        demo: {
          code: { type: 'demo', config: {}, push: destPush },
          before: 'mockMe',
        },
      },
      transformers: {
        mockMe: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'mockMe',
            config: context.config,
            push: transformerPush,
          }),
          config: { mock: { name: 'mocked event', data: {} } },
        },
      },
    });

    await elb('page view');

    // Transformer push should NOT be called — mock bypasses it
    expect(transformerPush).not.toHaveBeenCalled();
    // Destination should receive the mocked event
    expect(destPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'mocked event' }),
      expect.anything(),
    );
  });

  it('chainMock takes precedence over global mock', async () => {
    const destPush = jest.fn();
    const transformerPush = jest.fn(() => {
      throw new Error('should not be called');
    });

    const { elb } = await startFlow({
      destinations: {
        ga4: {
          code: { type: 'ga4', config: {}, push: destPush },
          before: 'transform',
        },
      },
      transformers: {
        transform: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'transform',
            config: context.config,
            push: transformerPush,
          }),
          config: {
            mock: { name: 'global mock' },
            chainMocks: { 'destination.ga4.before': { name: 'specific mock' } },
          },
        },
      },
    });

    await elb('page view');

    // Transformer push should NOT be called
    expect(transformerPush).not.toHaveBeenCalled();
    // Should use the chain-specific mock, not the global one
    expect(destPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'specific mock' }),
      expect.anything(),
    );
  });

  it('disabled transformer is skipped', async () => {
    const destPush = jest.fn();
    const transformerPush = jest.fn((event) => ({ event }));

    const { elb } = await startFlow({
      destinations: {
        demo: {
          code: { type: 'demo', config: {}, push: destPush },
          before: 'disabled',
        },
      },
      transformers: {
        disabled: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'disabled',
            config: context.config,
            push: transformerPush,
          }),
          config: { disabled: true },
        },
      },
    });

    await elb('page view');

    expect(transformerPush).not.toHaveBeenCalled();
    // Destination still receives the event (transformer was skipped, not dropped)
    expect(destPush).toHaveBeenCalled();
  });
});

describe('chainPath tracking', () => {
  it('sets chainPath for destination.before chain', async () => {
    let capturedChainPath: string | undefined;

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
        },
      },
      transformers: {
        enricher: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: context.config,
            push: async (event, ctx) => {
              capturedChainPath = ctx.ingest._meta.chainPath;
              return { event };
            },
          }),
        },
      },
      destinations: {
        ga4: {
          before: 'enricher',
          code: {
            type: 'ga4',
            config: {},
            push: async () => undefined,
          },
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(capturedChainPath).toBe('destination.ga4.before');
  });

  it('sets chainPath for destination.next chain', async () => {
    let capturedChainPath: string | undefined;

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
        },
      },
      transformers: {
        auditLog: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'auditLog',
            config: context.config,
            push: async (event, ctx) => {
              capturedChainPath = ctx.ingest._meta.chainPath;
              return { event };
            },
          }),
        },
      },
      destinations: {
        ga4: {
          code: {
            type: 'ga4',
            config: {},
            push: async () => ({ ok: true }),
          },
          next: 'auditLog',
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(capturedChainPath).toBe('destination.ga4.next');
  });

  it('does not set chainPath when no chainContext is provided', async () => {
    let capturedChainPath: string | undefined = 'SENTINEL';

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'passthrough',
        },
      },
      transformers: {
        passthrough: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'passthrough',
            config: context.config,
            push: async (event, ctx) => {
              capturedChainPath = ctx.ingest._meta.chainPath;
              return { event };
            },
          }),
        },
      },
      destinations: {
        sink: {
          code: {
            type: 'sink',
            config: {},
            push: async () => undefined,
          },
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    // source.next chains DO get a chainPath now, so this test verifies
    // that the chainPath is set to the source.next context
    expect(capturedChainPath).toBe('source.s.next');
  });

  it('sets chainPath for source.before chain', async () => {
    let capturedChainPath: string | undefined;

    const { collector } = await startFlow({
      sources: {
        web: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          before: 'preprocess',
        },
      },
      transformers: {
        preprocess: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'preprocess',
            config: context.config,
            push: async (event, ctx) => {
              capturedChainPath = ctx.ingest._meta.chainPath;
              return { event };
            },
          }),
        },
      },
      destinations: {
        sink: {
          code: {
            type: 'sink',
            config: {},
            push: async () => undefined,
          },
        },
      },
    });

    await collector.sources.web.push({ name: 'page view', data: {} });

    expect(capturedChainPath).toBe('source.web.before');
  });

  it('sets chainPath for source.next chain', async () => {
    let capturedChainPath: string | undefined;

    const { collector } = await startFlow({
      sources: {
        web: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'validate',
        },
      },
      transformers: {
        validate: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'validate',
            config: context.config,
            push: async (event, ctx) => {
              capturedChainPath = ctx.ingest._meta.chainPath;
              return { event };
            },
          }),
        },
      },
      destinations: {
        sink: {
          code: {
            type: 'sink',
            config: {},
            push: async () => undefined,
          },
        },
      },
    });

    await collector.sources.web.push({ name: 'page view', data: {} });

    expect(capturedChainPath).toBe('source.web.next');
  });
});
