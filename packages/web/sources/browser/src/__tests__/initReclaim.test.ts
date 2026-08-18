// Real collector + spy DESTINATION. Never mock collector.push here: the
// behavior under test spans source -> collector -> destination delivery.
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../';
import type { WalkerOS, Collector } from '@walkeros/core';
import type { BrowserPush } from '../types';
import { flushChain } from './test-utils';

const tagged = (step: number): HTMLDivElement => {
  const el = document.createElement('div');
  el.setAttribute('data-elb', 'checkout');
  el.setAttribute('data-elbaction', 'load:view');
  el.setAttribute('data-elb-checkout', `step:${step}`);
  return el;
};

describe('walker init subtree reclaim', () => {
  // Stable array reference: cleared in place, never reassigned, so a
  // destination closure from a leaked earlier flow can't write into a
  // later test's array unnoticed.
  const captured: WalkerOS.Event[] = [];
  const flows: Collector.Instance[] = [];

  beforeEach(() => {
    captured.length = 0;
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');
  });

  afterEach(async () => {
    // Tear each flow down so listeners/observers never leak across tests
    // (mirrors consentRace.test.ts's destroy discipline).
    for (const collector of flows.splice(0)) {
      await collector.command('shutdown');
    }
  });

  // `primary` names the source whose push `startFlow` exports as `elb`, and the
  // type parameter types it. That pairing is what a walker.js page runs on
  // (apps/walkerjs assigns this same `flow.elb` onto `window.elb`), and it
  // gives `elb('walker init', <element>)` its typed BrowserPush overload
  // without a cast. Declaring `primary` explicitly also keeps the export
  // pinned to the browser source if another source is ever added here.
  const start = async () => {
    const flow = await startFlow<BrowserPush>({
      sources: {
        browser: {
          code: sourceBrowser,
          primary: true,
          config: { settings: { pageview: false } },
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
    flows.push(flow.collector);
    await flushChain();
    return flow;
  };

  test('doc-scan-owned element re-fires on a later walker init <el>', async () => {
    const container = tagged(2);
    document.body.appendChild(container);

    const { elb } = await start();
    // Document run scan fired the initial view.
    expect(captured.filter((e) => e.name === 'checkout view')).toHaveLength(1);

    // The SPA re-tags the SAME element and asks for a re-init.
    container.setAttribute('data-elb-checkout', 'step:3');
    await elb('walker init', container);
    await flushChain();

    const views = captured.filter((e) => e.name === 'checkout view');
    expect(views).toHaveLength(2);
    expect(views[1].data).toEqual(expect.objectContaining({ step: 3 }));
  });

  test('re-init fires exactly once per call (no double-registration)', async () => {
    const container = tagged(2);
    document.body.appendChild(container);
    const { elb } = await start();

    await elb('walker init', container);
    await flushChain();
    await elb('walker init', container);
    await flushChain();

    // 1 (run scan) + 1 + 1
    expect(captured.filter((e) => e.name === 'checkout view')).toHaveLength(3);
  });
});
