import type { DestinationMetaPixel } from '.';
import { elb, Walkerjs } from '@elbwalker/walker.js';
import { getEvent } from '@elbwalker/utils';

describe('Destination Meta Pixel', () => {
  const w = window;
  let destination: DestinationMetaPixel.Destination,
    config: DestinationMetaPixel.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const pixelId = '1234567890';

  beforeEach(() => {
    config = {
      custom: { pixelId },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    w.fbq = mockFn;

    Walkerjs({ pageview: false, run: true, session: false });
  });

  afterEach(() => {});

  test('init', () => {
    (w.fbq as unknown) = undefined;

    expect(w.fbq).not.toBeDefined();

    elb('walker destination', destination);

    elb(event);
    expect(w.fbq).toBeDefined();
  });

  test('Init calls', () => {
    elb('walker destination', destination);

    elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'init', pixelId);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://connect.facebook.net/en_US/fbevents.js"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('push', () => {
    elb('walker destination', destination);
    elb(event);
    expect(mockFn).toHaveBeenCalledWith('track', event.event, {});
  });

  test('pageview', () => {
    elb('walker destination', destination);
    elb(event);
    expect(mockFn).toHaveBeenCalledWith('track', 'PageView');

    jest.clearAllMocks();
    destination.config.custom!.pageview = false;
    destination.config.init = false;
    elb(event);
    expect(mockFn).not.toHaveBeenCalledWith('track', 'PageView');
  });

  test('push standard event', () => {
    elb('walker destination', destination, {
      custom: { pixelId },
      mapping: {
        entity: { action: { custom: { trackCustom: { value: 'foo' } } } },
      },
    });
    elb(event);
    expect(mockFn).toHaveBeenCalledWith('trackCustom', 'foo', {});
  });

  test('event Purchase', () => {
    const event = getEvent('order complete');

    elb('walker destination', destination, {
      custom: { pixelId },
      mapping: {
        order: {
          complete: {
            name: 'Purchase',
            data: {
              map: {
                currency: { value: 'EUR' },
                value: 'data.total',
                contents: {
                  loop: [
                    'nested',
                    {
                      condition: (entity) => entity.type === 'product',
                      map: {
                        id: 'data.id',
                        quantity: { key: 'data.quantity', value: 1 },
                      },
                    },
                  ],
                },
                content_type: { value: 'product' },
              },
            },
          },
        },
      },
    });

    elb(event);
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({
        contents: [
          { id: 'ers', quantity: 1 },
          { id: 'cc', quantity: 1 },
        ],
        currency: 'EUR',
        value: 555,
      }),
    );
  });

  test('event AddToCart', () => {
    const event = getEvent('product add');

    elb('walker destination', destination, {
      custom: { pixelId },
      mapping: {
        product: {
          add: {
            name: 'AddToCart',
            data: {
              map: {
                currency: { value: 'EUR' },
                value: 'data.price',
                content_ids: {
                  fn: (event) =>
                    [event].map(
                      (product) => product.data.id || product.data.name,
                    ),
                },
                content_type: { value: 'product' },
              },
            },
          },
        },
      },
    });

    elb(event);
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'AddToCart',
      expect.objectContaining({
        content_ids: [event.data.id],
        content_type: 'product',
        currency: 'EUR',
        value: event.data.price,
      }),
    );
  });
});
