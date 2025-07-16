import type { WalkerOS } from '@walkerOS/core';
import type { DestinationMeta } from '.';
import { createCollector } from '@walkerOS/collector';
import { getEvent } from '@walkerOS/core';
import { destinationMetaExamples } from './examples';

const { events, mapping } = destinationMetaExamples;

describe('Destination Meta Pixel', () => {
  let elb: WalkerOS.Elb;
  const w = window;
  let destination: DestinationMeta.Destination, config: DestinationMeta.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const pixelId = '1234567890';

  beforeEach(async () => {
    config = {
      settings: { pixelId },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    w.fbq = mockFn;

    ({ elb } = await createCollector({
      session: false,
      tagging: 2,
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

  test('wrapper', async () => {
    (w.fbq as unknown) = undefined;
    const onCall = jest.fn();
    destination.config.wrapper = { onCall };
    elb('walker destination', destination);
    await elb(event);
    expect(onCall).toHaveBeenCalledTimes(2);
    expect(onCall).toHaveBeenCalledWith(
      { name: 'fbq', type: 'meta-pixel' },
      expect.any(Array),
    );
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
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      event.event,
      {},
      { eventID: event.id },
    );
  });

  test('pageview', async () => {
    const page_view = getEvent('page view');
    elb('walker destination', destination);

    await elb(page_view);
    expect(mockFn).toHaveBeenCalledWith(
      'track',
      'PageView',
      {},
      { eventID: page_view.id },
    );
  });

  test('push standard event', async () => {
    elb('walker destination', destination, {
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

    const config: DestinationMeta.Config = {
      settings: { pixelId },
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.Purchase());
  });

  test('event AddToCart', async () => {
    const event = getEvent('product add');

    elb('walker destination', destination, {
      settings: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.AddToCart());
  });

  test('event InitiateCheckout', async () => {
    const event = getEvent('cart view');

    elb('walker destination', destination, {
      settings: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.InitiateCheckout());
  });

  test('event ViewContent', async () => {
    const event = getEvent('product view');

    elb('walker destination', destination, {
      settings: { pixelId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ViewContent());
  });
});
