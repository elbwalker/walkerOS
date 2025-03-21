import type { DestinationMetaPixel } from '.';
import type { DestinationWeb } from '@elbwalker/walker.js';
import Walkerjs, { createInstance, Elb } from '@elbwalker/walker.js';
import { getEvent } from '@elbwalker/utils';
import { events, mapping } from '../examples';

describe('Destination Meta Pixel', () => {
  let elb: Elb.Fn;
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

    ({ elb } = createInstance({
      pageview: false,
      run: true,
      session: false,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    (w.fbq as unknown) = undefined;

    expect(w.fbq).not.toBeDefined();

    elb('walker destination', destination);

    await elb(event);
    expect(w.fbq).toBeDefined();
  });

  test('fn', async () => {
    (w.fbq as unknown) = undefined;
    const fn = jest.fn();
    destination.config.fn = fn;
    elb('walker destination', destination);
    await elb(event);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('Init calls', async () => {
    elb('walker destination', destination);

    await elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'init', pixelId);
  });

  test('init with load script', async () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://connect.facebook.net/en_US/fbevents.js"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    await elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('push', async () => {
    elb('walker destination', destination);
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith('track', event.event, {});
  });

  test('pageview', async () => {
    const page_view = getEvent('page view');
    elb('walker destination', destination);

    await elb(page_view);
    expect(mockFn).toHaveBeenCalledWith('track', 'PageView', {});

    jest.clearAllMocks();
    destination.config.mapping = { page: { view: { ignore: true } } };
    await elb(page_view);
    expect(mockFn).not.toHaveBeenCalledWith('track', 'PageView');
  });

  test('push standard event', async () => {
    elb('walker destination', destination, {
      custom: { pixelId },
      mapping: {
        entity: { action: { custom: { trackCustom: 'foo' } } },
      },
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith('trackCustom', 'foo', {});
  });

  test('event Purchase', async () => {
    const event = getEvent('order complete');

    const config: DestinationWeb.Config = {
      custom: { pixelId },
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.Purchase());
  });

  test('event AddToCart', async () => {
    const event = getEvent('product add');

    elb('walker destination', destination, {
      custom: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.AddToCart());
  });

  test('event InitiateCheckout', async () => {
    const event = getEvent('cart view');

    elb('walker destination', destination, {
      custom: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.InitiateCheckout());
  });

  test('event ViewContent', async () => {
    const event = getEvent('product view');

    elb('walker destination', destination, {
      custom: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ViewContent());
  });
});
