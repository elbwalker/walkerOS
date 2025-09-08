import type { WalkerOS } from '@walkeros/core';
import type { DestinationMeta } from '.';
import { createCollector } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationMetaExamples } from './examples';

const { events, mapping } = destinationMetaExamples;

describe('Destination Meta Pixel', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationMeta.Destination;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const pixelId = '1234567890';

  const testEnv = {
    window: {
      fbq: mockFn,
      _fbq: mockFn,
    },
    document: {
      createElement: jest.fn(() => ({
        src: '',
        async: false,
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
      })),
      head: { appendChild: jest.fn() },
    },
  };

  beforeEach(async () => {
    destination = jest.requireActual('.').default;

    jest.clearAllMocks();

    ({ elb } = await createCollector({
      tagging: 2,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    // Environment without fbq initially - setup() will populate it
    const initEnv = {
      window: {} as Record<string, unknown>,
      document: testEnv.document,
    };

    expect((initEnv.window as Record<string, unknown>).fbq).not.toBeDefined();

    const destinationWithEnv = {
      ...destination,
      env: initEnv,
    };
    elb('walker destination', destinationWithEnv, { settings: { pixelId } });

    await elb(event);
    // After setup() is called, fbq should be defined
    expect((initEnv.window as Record<string, unknown>).fbq).toBeDefined();
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
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: { pixelId },
      loadScript: true,
    });

    await elb(event);

    // Verify script createElement was called
    expect(testEnv.document.createElement).toHaveBeenCalledWith('script');
    // Verify appendChild was called
    expect(testEnv.document.head.appendChild).toHaveBeenCalled();
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
