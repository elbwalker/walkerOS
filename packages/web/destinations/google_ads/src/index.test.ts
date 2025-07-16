import type { WalkerOS } from '@walkerOS/core';
import type { DestinationAds } from '.';
import { createCollector } from '@walkerOS/collector';
import { getEvent } from '@walkerOS/core';
import { destinationAdsExamples } from './examples';

const { events, mapping } = destinationAdsExamples;

describe('destination Google Ads', () => {
  let elb: WalkerOS.Elb;
  const w = window;
  let destination: DestinationAds.Destination, config: DestinationAds.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent('order complete');
  const conversionId = 'AW-123456789';

  beforeEach(async () => {
    config = {
      settings: { conversionId },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    w.gtag = mockFn;

    ({ elb } = await createCollector({
      session: false,
      tagging: 2,
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

  test('wrapper', async () => {
    (w.gtag as unknown) = undefined;
    const onCall = jest.fn();
    elb('walker destination', destination, {
      ...config,
      mapping: { order: { complete: { name: 'label' } } },
      wrapper: { onCall },
    });

    await elb(event);
    expect(onCall).toHaveBeenCalledTimes(3);
    expect(onCall).toHaveBeenCalledWith(
      { name: 'gtag', type: 'google-ads' },
      expect.any(Array),
    );
  });

  test('Init calls', async () => {
    elb('walker destination', destination);

    await elb(event);

    expect(mockFn).toHaveBeenNthCalledWith(2, 'config', conversionId);
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
