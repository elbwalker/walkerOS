import { startFlow } from '..';
import type { Source, Transformer, Elb, Ingest } from '@walkeros/core';

describe('destination.next chain', () => {
  it('runs next chain after destination push with _response in ingest', async () => {
    let capturedResponse: unknown;
    let nextRan = false;

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
              nextRan = true;
              capturedResponse = ctx.ingest._response;
              return { event };
            },
          }),
        },
      },
      destinations: {
        api: {
          code: {
            type: 'api',
            config: {},
            push: async () => ({ status: 200, id: 'evt_123' }),
          },
          next: 'auditLog',
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(nextRan).toBe(true);
    expect(capturedResponse).toEqual({ status: 200, id: 'evt_123' });
  });

  it('does not run next chain when push fails', async () => {
    let nextRan = false;

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
        afterPush: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'afterPush',
            config: context.config,
            push: async (event) => {
              nextRan = true;
              return { event };
            },
          }),
        },
      },
      destinations: {
        failing: {
          code: {
            type: 'failing',
            config: {},
            push: async () => {
              throw new Error('Push failed');
            },
          },
          next: 'afterPush',
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(nextRan).toBe(false);
  });

  it('destination.next does not affect other destinations', async () => {
    const pushOrder: string[] = [];

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
        afterApi: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'afterApi',
            config: context.config,
            push: async (event) => {
              pushOrder.push('afterApi');
              return { event };
            },
          }),
        },
      },
      destinations: {
        api: {
          code: {
            type: 'api',
            config: {},
            push: async () => {
              pushOrder.push('api');
            },
          },
          next: 'afterApi',
        },
        warehouse: {
          code: {
            type: 'warehouse',
            config: {},
            push: async () => {
              pushOrder.push('warehouse');
            },
          },
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(pushOrder).toContain('api');
    expect(pushOrder).toContain('warehouse');
    expect(pushOrder).toContain('afterApi');
  });
});
