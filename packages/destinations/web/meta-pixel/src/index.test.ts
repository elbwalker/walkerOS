import webClient, { type WebClient } from '@elbwalker/walker.js';
import type { Config, Function } from './types';

describe('Destination Meta Pixel', () => {
  const w = window;
  let walkerjs: WebClient.Instance, destination: Function, config: Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const pixelId = '1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    config = {
      custom: { pixelId },
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    destination = require('.').default;
    destination.config = config;

    w.elbLayer = [];
    w.fbq = mockFn;

    walkerjs = webClient({ pageview: false });
    walkerjs.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    (w.fbq as unknown) = undefined;

    expect(w.fbq).not.toBeDefined();

    walkerjs.push('walker destination', destination);

    walkerjs.push(event);
    expect(w.fbq).toBeDefined();
  });

  test('Init calls', () => {
    walkerjs.push('walker destination', destination);

    walkerjs.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'init', pixelId);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    walkerjs.push('walker destination', destination);

    const scriptSelector = `script[src="https://connect.facebook.net/en_US/fbevents.js"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    walkerjs.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('push', () => {
    walkerjs.push('walker destination', destination);
    walkerjs.push(event);
    expect(mockFn).toHaveBeenCalledWith('trackCustom', event);
  });

  test('pageview', () => {
    walkerjs.push('walker destination', destination);
    walkerjs.push(event);
    expect(mockFn).toHaveBeenCalledWith('track', 'PageView');

    jest.clearAllMocks();
    destination.config.custom!.pageview = false;
    destination.config.init = false;
    walkerjs.push(event);
    expect(mockFn).not.toHaveBeenCalledWith('track', 'PageView');
  });

  test('push standard event', () => {
    destination.config.mapping = {
      entity: { action: { custom: { track: 'Contact' } } },
    };

    walkerjs.push('walker destination', destination);
    walkerjs.push(event);
    expect(mockFn).toHaveBeenCalledWith('track', 'Contact', {});
  });

  test('push purchase', () => {
    destination.config.mapping = {
      entity: {
        action: {
          custom: {
            track: 'Purchase',
            content_name: 'data.title',
            value: 'data.revenue',
          },
        },
      },
    };
    walkerjs.push('walker destination', destination);

    walkerjs.push(event, { title: 'Shirt', revenue: 42 });
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({
        content_name: 'Shirt',
        currency: 'EUR',
        value: 42,
      }),
    );

    walkerjs.push(event);
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({ value: 1 }),
    );
  });

  test('push addToCart', () => {
    destination.config.mapping = {
      entity: {
        action: {
          custom: {
            track: 'AddToCart',
            content_name: 'data.title',
            content_type: 'product',
            value: 'data.price',
          },
        },
      },
    };

    walkerjs.push('walker destination', destination);
    walkerjs.push(event, { title: 'Shirt', price: 3.14 });
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'AddToCart',
      expect.objectContaining({
        content_name: 'Shirt',
        content_type: 'product',
        currency: 'EUR',
        value: 3.14,
      }),
    );
  });

  test('Property contents', () => {
    destination.config.mapping = {
      use: {
        data: {
          custom: {
            track: 'Purchase',
            contents: {
              id: 'data.id',
              quantity: {
                key: 'data.quantity',
              },
            },
          },
        },
        nested: {
          custom: {
            track: 'ViewContent',
            contents: {
              id: 'nested.*.data.id',
              quantity: { key: 'nested.*.data.quantity', default: 9 },
            },
          },
        },
      },
    };

    walkerjs.push('walker destination', destination);

    walkerjs.push('use data', { id: 'sku', quantity: 5 });
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({
        contents: [{ id: 'sku', quantity: 5 }],
      }),
    );

    walkerjs.push('use nested', {}, 'custom', { quantity: [2, 0] }, [
      {
        type: 'product',
        data: { id: 'a', quantity: 3 },
        nested: [],
        context: {},
      },
      {
        type: 'product',
        data: { id: 'b' },
        nested: [],
        context: {},
      },
    ]);
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'ViewContent',
      expect.objectContaining({
        content_ids: ['a', 'b'],
        contents: [
          { id: 'a', quantity: 3 },
          { id: 'b', quantity: 9 },
        ],
      }),
    );
  });
});
