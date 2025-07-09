import type { Elb } from '@walkerOS/web-collector';
import type { DestinationAds } from '.';
import { createWebCollector } from '@walkerOS/web-collector';
import { getEvent } from '@walkerOS/core';
import { destinationAdsExamples } from './examples';

const { events, mapping } = destinationAdsExamples;

describe('destination Google Ads', () => {
  let elb: Elb.Fn;
  const w = window;
  let destination: DestinationAds.Destination, config: DestinationAds.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent('order complete');
  const conversionId = 'AW-123456789';

  beforeEach(() => {
    config = {
      settings: { conversionId },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    w.gtag = mockFn;

    ({ elb } = createWebCollector({
      session: false,
      pageview: false,
      run: true,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    (w.dataLayer as unknown) = undefined;
    (w.gtag as unknown) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elb('walker destination', destination);

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    await elb(event);
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

  test('Init calls', async () => {
    elb('walker destination', destination);

    await elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', conversionId);
  });

  test('init with load script', async () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${conversionId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    await elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('event conversion', async () => {
    elb('walker destination', destination, {
      settings: { conversionId },
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.conversion());
  });
});
