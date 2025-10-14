import type { WalkerOS } from '@walkeros/core';
import type { DestinationMeta } from '.';
import { startFlow } from '@walkeros/collector';
import { getEvent, clone } from '@walkeros/core';
import { examples } from '.';

const { events, mapping } = examples;

describe('Destination Meta Pixel', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationMeta.Destination;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const pixelId = '1234567890';

  // Create test environment using clone and modify fbq function
  const testEnv = clone(examples.env.push);
  testEnv.window.fbq = mockFn;
  testEnv.window._fbq = mockFn;

  beforeEach(async () => {
    destination = jest.requireActual('.').default;

    jest.clearAllMocks();

    ({ elb } = await startFlow({
      tagging: 2,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    // Use clone of init environment where fbq is undefined
    const initEnv = clone(examples.env.init);
    expect(initEnv?.window.fbq).not.toBeDefined();

    const destinationWithEnv = {
      ...destination,
      env: initEnv,
    };
    elb('walker destination', destinationWithEnv, { settings: { pixelId } });

    await elb(event);
    // After setup() is called, fbq should be defined
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
    // Use Jest spies on the cloned environment
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

    // Verify script createElement was called
    expect(createElementSpy).toHaveBeenCalledWith('script');
    // Verify appendChild was called
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

  test('pageview', async () => {
    const page_view = getEvent('page view');
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, { settings: { pixelId } });

    await elb(page_view);
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'PageView',
      {},
      { eventID: page_view.id },
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

  test('event Purchase', async () => {
    const event = getEvent('order complete');

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.Purchase());
  });

  test('event AddToCart', async () => {
    const event = getEvent('product add');

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.AddToCart());
  });

  test('event InitiateCheckout', async () => {
    const event = getEvent('cart view');

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.InitiateCheckout());
  });

  test('event ViewContent', async () => {
    const event = getEvent('product view');

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ViewContent());
  });
});
