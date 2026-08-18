// Proves source-level pipeline config executes for browser events.
// Real startFlow + spy destination + a 'tap' transformer wired as the
// source's next chain. Do NOT mock collector.push.
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../';
import type { Transformer, WalkerOS } from '@walkeros/core';
import { flushChain } from './test-utils';

describe('browser source pipeline routing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');
  });

  test('a next chain on the browser source runs, and events carry the source id', async () => {
    const seen: string[] = [];
    document.body.innerHTML =
      '<div data-elb="p" data-elbaction="load:view"></div>';

    const captured: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      sources: {
        browser: {
          code: sourceBrowser,
          config: { settings: { pageview: false } },
          next: 'tap',
        },
      },
      // A transformer's `code` MUST be a factory returning a
      // Transformer.Instance, and its push must return `{ event }` (a bare
      // `return event` reads as "no event"). The push param is deliberately
      // un-annotated: strictFunctionTypes rejects narrowing to WalkerOS.Event.
      transformers: {
        tap: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'tap',
            config: context.config,
            push: async (event) => {
              seen.push(event.name ?? '');
              return { event };
            },
          }),
        },
      },
      destinations: {
        cap: {
          code: {
            type: 'capture',
            config: {},
            push: (event: WalkerOS.Event) => {
              captured.push(event);
            },
          },
        },
      },
    });
    await flushChain();

    // The DOM load trigger's event went through the source's next chain...
    expect(seen).toContain('p view');
    // ...was delivered...
    expect(captured.map((e) => e.name)).toContain('p view');
    // ...and the source is no longer invisible to status.
    expect(collector.status.sources.browser?.count).toBe(1);
  });

  test('walker commands still route through elb (not the pipeline)', async () => {
    const { collector, elb } = await startFlow({
      sources: {
        browser: {
          code: sourceBrowser,
          config: { settings: { pageview: false } },
        },
      },
    });
    await flushChain();
    const result = await elb('walker consent', { functional: true });
    expect(result.ok).toBe(true);
    expect(collector.consent).toEqual(
      expect.objectContaining({ functional: true }),
    );
  });
});
