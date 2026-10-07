import { startFlow } from '@walkeros/collector';
import type { Elb, WalkerOS } from '@walkeros/core';
import { sourceBrowser } from '@walkeros/web-source-browser';

/**
 * jsdom has no innerText; the browser source reads `#innerText`. The demos do
 * not transform their kickers, so in a browser innerText equals textContent.
 */
export function defineInnerText(): void {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    configurable: true,
    get(this: HTMLElement): string {
      return this.textContent ?? '';
    },
  });
}

/** A container in the document holding `html`. */
export function mount(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  return container;
}

/**
 * Settles the collector's promise chain. A bound, not a tuned value: an event
 * still missing after this many turns waits on a timer, not on the queue.
 */
export async function flushChain(): Promise<void> {
  for (let i = 0; i < 200; i++) await Promise.resolve();
}

export interface Recording {
  readonly container: HTMLElement;
  readonly events: WalkerOS.Event[];
  readonly elb: Elb.Fn;
}

/** A real collector with the real browser source on `container`; a destination records delivery. */
export async function record(container: HTMLElement): Promise<Recording> {
  const events: WalkerOS.Event[] = [];
  const { elb } = await startFlow({
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          settings: {
            prefix: 'data-elb',
            scope: container,
            pageview: false,
            elb: false,
          },
        },
      },
    },
    destinations: {
      recorder: {
        code: {
          type: 'recorder',
          config: {},
          push: (event: WalkerOS.Event) => {
            events.push(event);
          },
        },
      },
    },
  });
  await flushChain();
  return { container, events, elb };
}

/** Destroys the source and the collector, and removes the container. */
export async function stop(recording: Recording): Promise<void> {
  await recording.elb('walker shutdown');
  recording.container.remove();
}
