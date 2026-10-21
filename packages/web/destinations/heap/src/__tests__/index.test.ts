import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationHeap } from '..';
import type { HeapSDK } from '../types';

const SRC = 'https://cdn.heapanalytics.com/js/heap-APPID.js';

/** The script `loadVendor` added, once the destination initialized. */
async function injected(src: string): Promise<Element | null> {
  for (let tick = 0; tick < 50; tick++) {
    const script = document.querySelector(`script[src="${src}"]`);
    if (script) return script;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  return null;
}

/** The classic SDK's object as it replaces window.heap on load (no start/stopTracking). */
function classicHeap(tracked: string[]): HeapSDK {
  const noop = () => undefined;
  return {
    appid: 'APPID',
    track: (name) => {
      tracked.push(name);
    },
    identify: noop,
    resetIdentity: noop,
    addUserProperties: noop,
    addEventProperties: noop,
    clearEventProperties: noop,
  };
}

describe('heap destination', () => {
  beforeEach(() => {
    jest.useRealTimers();
    delete window.heap;
  });

  it('sends the events pushed before the classic SDK loaded once it has, and takes consent commands', async () => {
    const tracked: string[] = [];
    const { elb, collector } = await startFlow({
      destinations: {
        heap: {
          code: destinationHeap,
          config: {
            loadScript: true,
            consent: { analytics: true },
            settings: { appId: 'APPID' },
          },
        },
      },
    });

    // The grant starts the destination, whose consent call waits for the SDK.
    const granted = elb('walker consent', { analytics: true });
    const script = await injected(SRC);
    expect(script?.hasAttribute('data-walkeros-vendor')).toBe(true);
    const first = elb(getEvent('page view'));
    // The SDK read the app id from window.heap and replaces it on load.
    expect(window.heap?.appid).toBe('APPID');
    window.heap = classicHeap(tracked);
    script?.dispatchEvent(new Event('load'));

    await granted;
    expect((await first).ok).toBe(true);
    await elb('walker consent', { analytics: true });
    expect((await elb(getEvent('product view'))).ok).toBe(true);

    expect(tracked).toEqual(['page view', 'product view']);
    expect(collector.status.destinations.heap?.failed ?? 0).toBe(0);
  });
});
