import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import destinationPiano from '..';
import type { Env } from '../types';

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

describe('piano script', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('a script that failed to load fails the pushes with vendor-not-loaded', async () => {
    const sendEvent = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations: jest.fn(), sendEvent, sendEvents: jest.fn() },
      },
    };
    const { elb } = await startFlow({
      destinations: {
        piano: {
          code: { ...destinationPiano, env },
          config: {
            loadScript: true,
            timeout: 1000,
            settings: { site: 1, collectDomain: 'https://example.pa-cd.com' },
          },
        },
      },
    });

    const pushed = elb(getEvent());
    (await injected(SCRIPT_SRC))?.dispatchEvent(new Event('error'));
    const result = await pushed;

    expect(result.ok).toBe(false);
    expect(result.failed?.piano?.reason).toMatchObject({
      code: 'vendor-not-loaded',
    });
    expect(sendEvent).not.toHaveBeenCalled();
  });
});
