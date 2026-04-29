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
    elb('walker destination', destinationWithEnv, { settings: { pixelId } });

    await elb(event);
    expect(initEnv?.window.fbq).toBeDefined();
  });

  test('Init calls', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, { settings: { pixelId } });

    await elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'init', pixelId);
  });

  test('init with load script', async () => {
    const scriptEnv = clone(examples.env.push);
    const createElementSpy = jest.fn(
      () =>
        ({
          src: '',
          async: false,
          setAttribute: jest.fn(),
          removeAttribute: jest.fn(),
        }) as unknown as Element,
    );
    const appendChildSpy = jest.fn();

    scriptEnv.document.createElement = createElementSpy;
    scriptEnv.document.head.appendChild = appendChildSpy;

    const destinationWithEnv = {
      ...destination,
      env: scriptEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: { pixelId },
      loadScript: true,
    });

    await elb(event);

    expect(createElementSpy).toHaveBeenCalledWith('script');
    expect(appendChildSpy).toHaveBeenCalled();
  });

  test('push', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, { settings: { pixelId } });
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
    elb('walker destination', destinationWithEnv, {
      settings: { pixelId },
      mapping: {
        entity: { action: { settings: { trackCustom: 'foo' } } },
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
