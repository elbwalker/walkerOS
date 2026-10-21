import type { Collector, Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import { flushChain } from './test-utils';

// Leaving the page flushes every destination batch, so events waiting in a
// batch window are sent before the page goes away: a real collector, the
// browser source and a destination whose batch waits longer than the test.

let current: Collector.Instance | undefined;
let batches: WalkerOS.Events[] = [];

const batching: Destination.Instance = {
  type: 'batching',
  config: { batch: { wait: 60000 } },
  push: () => undefined,
  pushBatch: (batch) => {
    batches.push(batch.events);
  },
};

async function start(): Promise<Collector.Instance> {
  const { collector } = await startFlow({
    sources: {
      browser: {
        code: sourceBrowser,
        config: { settings: { pageview: false } },
      },
    },
    destinations: { batching: { code: batching } },
  });
  current = collector;
  await flushChain();
  return collector;
}

async function pushTwo(collector: Collector.Instance) {
  await collector.push({ name: 'product view' });
  await collector.push({ name: 'product add' });
}

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });

beforeEach(() => {
  batches = [];
  setVisibility('visible');
});

afterEach(async () => {
  await current?.command('shutdown');
  current = undefined;
  Reflect.deleteProperty(window, 'elbLayer');
  Reflect.deleteProperty(window, 'elb');
  setVisibility('visible');
});

const names = () => batches.map((events) => events.map(({ name }) => name));

describe('flush when the page goes away', () => {
  it('sends the pending batch on pagehide', async () => {
    const collector = await start();
    await pushTwo(collector);
    expect(batches).toHaveLength(0);

    window.dispatchEvent(new Event('pagehide'));
    await flushChain();

    expect(names()).toEqual([['product view', 'product add']]);
  });

  it('sends the pending batch when the document turns hidden, not visible', async () => {
    const collector = await start();
    await pushTwo(collector);

    document.dispatchEvent(new Event('visibilitychange'));
    await flushChain();
    expect(batches).toHaveLength(0);

    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await flushChain();

    expect(names()).toEqual([['product view', 'product add']]);
  });

  it('removes both listeners on destroy', async () => {
    const collector = await start();
    await pushTwo(collector);
    await collector.sources.browser.destroy?.({
      id: 'browser',
      config: collector.sources.browser.config,
      env: {
        push: collector.push,
        command: collector.command,
        elb: collector.elb,
        logger: collector.logger,
      },
      logger: collector.logger,
    });

    window.dispatchEvent(new Event('pagehide'));
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await flushChain();

    expect(batches).toHaveLength(0);
  });
});
