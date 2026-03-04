// This test validates whether source.next: 'spy' actually intercepts events.
// It's a proof-of-concept, not a permanent test.
import { startFlow } from '../flow';

describe('source.next spy mechanism validation', () => {
  it('spy transformer receives events pushed by source on run', async () => {
    const captured: unknown[] = [];
    const logs: string[] = [];

    const { collector } = await startFlow({
      consent: { analytics: true },
      sources: {
        test: {
          code: (ctx) => {
            logs.push('source-init');
            return {
              type: 'test',
              config: {},
              push: ctx.env.push,
              on(event) {
                logs.push(`source-on-${event}`);
                if (event === 'run') {
                  logs.push('source-pushing');
                  ctx.env.push({ name: 'hello world', data: { from: 'test' } });
                  logs.push('source-pushed');
                }
              },
            };
          },
          next: 'spy',
        },
      },
      transformers: {
        spy: {
          code: () => {
            logs.push('spy-init');
            return {
              type: 'spy',
              config: {},
              push(event) {
                logs.push('spy-push-called');
                captured.push(JSON.parse(JSON.stringify(event)));
                return event;
              },
            };
          },
        },
      },
    });

    // Log everything for debugging
    console.log('Execution log:', logs);
    console.log('Captured events:', captured);
    console.log('Collector transformers:', Object.keys(collector.transformers));
    console.log('Collector sources:', Object.keys(collector.sources));

    // Core assertion: did the spy capture the event?
    expect(captured.length).toBe(1);
    expect((captured[0] as { name?: string }).name).toBe('hello world');
  });

  it('spy transformer receives events pushed by source via direct push (no on handler)', async () => {
    const captured: unknown[] = [];

    const { collector } = await startFlow({
      consent: { analytics: true },
      sources: {
        test: {
          code: (ctx) => ({
            type: 'test',
            config: {},
            push: ctx.env.push,
          }),
          next: 'spy',
        },
      },
      transformers: {
        spy: {
          code: () => ({
            type: 'spy',
            config: {},
            push(event) {
              captured.push(JSON.parse(JSON.stringify(event)));
              return event;
            },
          }),
        },
      },
    });

    // Push directly through the source's push
    const testSource = collector.sources.test;
    if (testSource) {
      await testSource.push({ name: 'direct push', data: {} });
    }

    console.log('Captured after direct push:', captured);

    // NOTE: testSource.push is the source instance's push, which is ctx.env.push
    // (the wrappedPush). This should go through the preChain.
    expect(captured.length).toBe(1);
  });

  it('verifies transformer init order vs source init order', async () => {
    const order: string[] = [];

    await startFlow({
      sources: {
        mySource: {
          code: (ctx) => {
            order.push('source-code-called');
            return { type: 'test', config: {}, push: ctx.env.push };
          },
          next: 'mySpy',
        },
      },
      transformers: {
        mySpy: {
          code: () => {
            order.push('transformer-code-called');
            return {
              type: 'spy',
              config: {},
              push(e) {
                return e;
              },
            };
          },
        },
      },
    });

    console.log('Init order:', order);
    // Transformers MUST init before sources for preChain to work
    expect(order.indexOf('transformer-code-called')).toBeLessThan(
      order.indexOf('source-code-called'),
    );
  });

  it('verifies preChain is correctly resolved from source.next', async () => {
    const logs: string[] = [];

    // Intercept to see what preChain looks like
    const { collector } = await startFlow({
      sources: {
        test: {
          code: (ctx) => {
            // The wrappedPush closure captures preChain at init time
            return {
              type: 'test',
              config: {},
              push: ctx.env.push,
              on(event) {
                if (event === 'run') {
                  logs.push('source-on-run');
                }
              },
            };
          },
          next: 'spy',
        },
      },
      transformers: {
        spy: {
          code: () => ({
            type: 'spy',
            config: {},
            push(event) {
              logs.push('spy-push');
              return event;
            },
          }),
        },
      },
    });

    console.log('Logs after startFlow:', logs);
    console.log('Transformers:', Object.keys(collector.transformers));
    console.log('Sources:', Object.keys(collector.sources));

    // The source should have received on('run') via onApply
    expect(logs).toContain('source-on-run');
  });
});
