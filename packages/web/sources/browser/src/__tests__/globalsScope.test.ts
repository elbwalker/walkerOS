import { startFlow } from '@walkeros/collector';
import {
  createBrowserSource,
  destroyAllTestSources,
  flushChain,
} from './test-utils';
import type { WalkerOS } from '@walkeros/core';

// Real collector + capturing destination; returns emitted events.
async function setup() {
  const events: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    destinations: {
      capture: {
        code: {
          type: 'capture',
          config: {},
          push: async (event: WalkerOS.Event) => {
            events.push(event);
          },
        },
      },
    },
  });
  return { collector, events };
}

const globalsOf = (
  events: WalkerOS.Event[],
  name: string,
): WalkerOS.Properties | undefined =>
  events.find((event) => event.name === name)?.globals;

const byId = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) throw new Error(`${id} missing`);
  return el;
};

describe('globals scope', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.elbLayer = undefined;
  });

  afterEach(async () => {
    await destroyAllTestSources();
    document.body.innerHTML = '';
    window.elbLayer = undefined;
  });

  test('walker init on a sub-scope keeps the document globals', async () => {
    const { collector, events } = await setup();
    document.body.innerHTML = `
      <div data-elbglobals="lang:de"></div>
      <div id="sub">
        <button data-elb="p" data-elb-p="k:v" data-elbaction="load:view;hover:hovered">go</button>
      </div>
    `;
    const { elb } = await createBrowserSource(collector, { pageview: false });
    events.length = 0;

    await elb('walker init', byId('sub'));
    await flushChain();

    expect(globalsOf(events, 'p view')).toEqual({ lang: 'de' });

    // A per-element listener registered under the same sub-scope context
    // resolves globals the same way the load trigger does.
    const button = document.querySelector('button');
    if (!(button instanceof HTMLElement)) throw new Error('button missing');
    button.dispatchEvent(new MouseEvent('mouseenter'));
    await flushChain();

    expect(globalsOf(events, 'p hovered')).toEqual({ lang: 'de' });
  });

  test('a click inside a sub-scope keeps the document globals', async () => {
    const { collector, events } = await setup();
    document.body.innerHTML = `
      <div data-elbglobals="lang:de"></div>
      <div id="sub">
        <button data-elb="p" data-elb-p="k:v" data-elbaction="click:tap">go</button>
      </div>
    `;
    const { elb } = await createBrowserSource(collector, { pageview: false });
    await elb('walker init', byId('sub'));
    await flushChain();
    events.length = 0;

    const button = document.querySelector('button');
    if (button instanceof HTMLElement) button.click();
    await flushChain();

    expect(globalsOf(events, 'p tap')).toEqual({ lang: 'de' });
  });

  test('a source scoped to an element reads globals from that subtree only', async () => {
    const { collector, events } = await setup();
    document.body.innerHTML = `
      <div data-elbglobals="lang:de"></div>
      <div id="widget">
        <div data-elbglobals="widget:yes"></div>
        <button data-elb="p" data-elb-p="k:v" data-elbaction="load:view">go</button>
      </div>
    `;

    await createBrowserSource(
      collector,
      { pageview: false, scope: byId('widget'), elb: false, elbLayer: false },
      { runOnInit: true },
    );

    expect(globalsOf(events, 'p view')).toEqual({ widget: 'yes' });
  });
});
