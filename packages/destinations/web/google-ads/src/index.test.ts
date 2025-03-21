import type { DestinationGoogleAds } from '.';
import { createInstance, Elb } from '@elbwalker/walker.js';
import { getEvent } from '@elbwalker/utils';
import { events, mapping } from '../examples';

describe('destination Google Ads', () => {
  let elb: Elb.Fn;
  const w = window;
  let destination: DestinationGoogleAds.Destination,
    config: DestinationGoogleAds.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent('order complete');
  const conversionId = 'AW-123456789';

  beforeEach(() => {
    config = {
      custom: { conversionId },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    w.gtag = mockFn;

    ({ elb } = createInstance({
      session: false,
      pageview: false,
      run: true,
    }));
  });

  afterEach(() => {});

  test('init', () => {
    (w.dataLayer as unknown) = undefined;
    (w.gtag as unknown) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elb('walker destination', destination);

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elb(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();
  });

  test('fn', async () => {
    (w.gtag as unknown) = undefined;
    const fn = jest.fn();
    elb('walker destination', destination, {
      ...config,
      mapping: { order: { complete: { name: 'label' } } },
      fn,
    });

    await elb(event);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('Init calls', () => {
    elb('walker destination', destination);

    elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', conversionId);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${conversionId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('event conversion', async () => {
    elb('walker destination', destination, {
      custom: { conversionId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.conversion());
  });
});
