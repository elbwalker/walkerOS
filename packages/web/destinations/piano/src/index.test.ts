import type { Config, Env } from './types';
import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import destinationPiano from '.';

const SCRIPT_SRC = 'https://tag.aticdn.net/piano-analytics.js';

/** The script `loadVendor` added, once the first push initialized the destination. */
async function injected(src: string): Promise<Element | null> {
  for (let tick = 0; tick < 50; tick++) {
    const script = document.querySelector(`script[src="${src}"]`);
    if (script) return script;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  return null;
}

describe('destination piano', () => {
  const site = 123456789;
  const collectDomain = 'https://example.pa-cd.com';

  beforeEach(() => {
    jest.restoreAllMocks();
    // The script deadline and the push timeout run on real timers.
    jest.useRealTimers();
  });

  async function register(env: Env, config: Config = {}) {
    const { elb } = await startFlow({
      destinations: {
        piano: {
          code: { ...destinationPiano, env },
          config: { settings: { site, collectDomain }, ...config },
        },
      },
    });
    return elb;
  }

  test('configures piano on init', async () => {
    const setConfigurations = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations, sendEvent: jest.fn(), sendEvents: jest.fn() },
      },
    };

    const elb = await register(env);
    await elb(getEvent());

    expect(setConfigurations).toHaveBeenCalledWith({ site, collectDomain });
  });

  test('sends a mapped event', async () => {
    const sendEvent = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations: jest.fn(), sendEvent, sendEvents: jest.fn() },
      },
    };

    const elb = await register(env, {
      mapping: {
        page: {
          view: { name: 'page.display', data: { map: { page: 'data.title' } } },
        },
      },
    });
    await elb(getEvent('page view'));

    expect(sendEvent).toHaveBeenCalledWith('page.display', {
      page: 'walkerOS documentation',
    });
  });

  test('reports a missing SDK as vendor-not-ready', async () => {
    const env: Env = { window: {} };

    const elb = await register(env);
    const result = await elb(getEvent());

    expect(result.ok).toBe(false);
    expect(result.failed?.piano?.reason).toMatchObject({
      code: 'vendor-not-ready',
      retryable: true,
    });
  });

  test('loadScript waits for the script, then configures and sends', async () => {
    const setConfigurations = jest.fn();
    const sendEvent = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations, sendEvent, sendEvents: jest.fn() },
      },
    };

    const elb = await register(env, { loadScript: true });
    const pushed = elb(getEvent());

    const script = await injected(SCRIPT_SRC);
    expect(script?.hasAttribute('data-walkeros-vendor')).toBe(true);
    expect(sendEvent).not.toHaveBeenCalled();

    script?.dispatchEvent(new Event('load'));
    expect((await pushed).ok).toBe(true);
    expect(setConfigurations).toHaveBeenCalledWith({ site, collectDomain });
    expect(sendEvent).toHaveBeenCalledTimes(1);
  });
});
