import type { WalkerOS } from '@walkeros/core';
import type { DestinationMeta } from '.';
import { startFlow } from '@walkeros/collector';
import { getEvent, clone } from '@walkeros/core';
import { examples } from './dev';

describe('Destination Meta Pixel', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationMeta.Destination;

  const mockFn = jest.fn();

  const event = getEvent();
  const pixelId = '1234567890';

  const testEnv = clone(examples.env.push);
  testEnv.window.fbq = mockFn;
  testEnv.window._fbq = mockFn;

  beforeEach(async () => {
    destination = jest.requireActual('.').default;

    jest.clearAllMocks();

    ({ elb } = await startFlow());
  });

  afterEach(() => {});

  test('init', async () => {
    const initEnv = clone(examples.env.init);
    expect(initEnv?.window.fbq).not.toBeDefined();

    const destinationWithEnv = {
      ...destination,
      env: initEnv,
    };
    elb('walker destination', {
      code: destinationWithEnv,
      config: { settings: { pixelId } },
    });

    await elb(event);
    expect(initEnv?.window.fbq).toBeDefined();
  });

  test('Init calls', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', {
      code: destinationWithEnv,
      config: { settings: { pixelId } },
    });

    await elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'init', pixelId);
  });

  test('init with load script', async () => {
    const destinationWithEnv = {
      ...destination,
      env: clone(examples.env.push),
    };
    elb('walker destination', {
      code: destinationWithEnv,
      config: {
        settings: { pixelId },
        loadScript: true,
      },
    });

    await elb(event);

    const script = document.querySelector(
      'script[src="https://connect.facebook.net/en_US/fbevents.js"]',
    );
    expect(script?.hasAttribute('data-walkeros-vendor')).toBe(true);
  });

  test('consent revocation reaches the pixel of a gated destination', async () => {
    const calls: unknown[][] = [];
    const env = clone(examples.env.push);
    env.window.fbq = (...args: unknown[]) => {
      calls.push(args);
    };
    elb('walker destination', {
      code: { ...destination, env },
      config: { consent: { marketing: true }, settings: { pixelId } },
    });

    await elb('walker consent', { marketing: true });
    await elb(event);
    await elb('walker consent', { marketing: false });

    expect(calls).toEqual([
      ['init', pixelId],
      ['consent', 'grant'],
      ['track', event.name, {}, { eventID: event.id }],
      ['consent', 'revoke'],
    ]);
  });

  test('push', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', {
      code: destinationWithEnv,
      config: { settings: { pixelId } },
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      event.name,
      {},
      { eventID: event.id },
    );
  });

  test('push standard event', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', {
      code: destinationWithEnv,
      config: {
        settings: { pixelId },
        mapping: {
          entity: { action: { settings: { trackCustom: 'foo' } } },
        },
      },
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(
      'trackCustom',
      'foo',
      {},
      { eventID: event.id },
    );
  });
});
