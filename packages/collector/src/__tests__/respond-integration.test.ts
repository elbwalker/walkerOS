import { startFlow } from '../index';
import { createRespond } from '@walkeros/core';
import type { RespondFn } from '@walkeros/core';

describe('env.respond', () => {
  it('transformer receives respond on env', async () => {
    let capturedRespond: RespondFn | undefined;

    const { collector } = await startFlow({
      transformers: {
        capture: {
          code: async (ctx) => ({
            type: 'capture',
            config: ctx.config,
            push: async (event, context) => {
              capturedRespond = context.env.respond;
              return event;
            },
          }),
        },
      },
    });

    const sender = jest.fn();
    const respond = createRespond(sender);

    await collector.push(
      { name: 'page view' },
      { respond, preChain: ['capture'] },
    );

    expect(capturedRespond).toBe(respond);
  });

  it('transformer can call env.respond', async () => {
    const sender = jest.fn();
    const respond = createRespond(sender);

    const { collector } = await startFlow({
      transformers: {
        responder: {
          code: async (ctx) => ({
            type: 'responder',
            config: ctx.config,
            push: async (event, context) => {
              context.env.respond?.({
                body: 'hello',
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
              });
              return false as const; // stop chain
            },
          }),
        },
      },
    });

    await collector.push(
      { name: 'page view' },
      { respond, preChain: ['responder'] },
    );

    expect(sender).toHaveBeenCalledWith({
      body: 'hello',
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  });

  it('destination receives respond on env', async () => {
    let capturedRespond: RespondFn | undefined;
    const sender = jest.fn();
    const respond = createRespond(sender);

    const { collector } = await startFlow({
      destinations: {
        capture: {
          code: {
            type: 'capture',
            config: {},
            push: async (event: unknown, context: any) => {
              capturedRespond = context.env.respond;
            },
          },
        },
      },
    });

    await collector.push({ name: 'page view' }, { respond });

    expect(capturedRespond).toBe(respond);
  });

  it('destination can call env.respond', async () => {
    const sender = jest.fn();
    const respond = createRespond(sender);

    const { collector } = await startFlow({
      destinations: {
        responder: {
          code: {
            type: 'responder',
            config: {},
            push: async (event: unknown, context: any) => {
              context.env.respond?.({ body: { ok: true }, status: 201 });
            },
          },
        },
      },
    });

    await collector.push({ name: 'page view' }, { respond });

    expect(sender).toHaveBeenCalledWith({ body: { ok: true }, status: 201 });
  });

  it('source setRespond flows to transformer env', async () => {
    let capturedRespond: RespondFn | undefined;
    const sender = jest.fn();
    const respond = createRespond(sender);

    const { collector } = await startFlow({
      sources: {
        mySource: {
          code: async (ctx) => {
            return {
              type: 'test',
              config: ctx.config,
              push: async () => {
                // Source sets respond before pushing
                ctx.setRespond(respond);
                await ctx.env.push({ name: 'page view' });
              },
            };
          },
          next: 'capture',
        },
      },
      transformers: {
        capture: {
          code: async (ctx) => ({
            type: 'capture',
            config: ctx.config,
            push: async (event, context) => {
              capturedRespond = context.env.respond;
              return event;
            },
          }),
        },
      },
    });

    // Trigger the source's push method directly
    await (collector.sources.mySource as any).push();

    expect(capturedRespond).toBe(respond);
  });
});
