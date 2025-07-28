import type { WalkerOS } from '@walkeros/core';
import type { DestinationPiwikPro } from '.';
import { createCollector } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationPiwikProExamples } from './examples';

const { events, mapping } = destinationPiwikProExamples;

describe('Destination PiwikPro', () => {
  let elb: WalkerOS.Elb;
  const w = window;
  let destination: DestinationPiwikPro.Destination,
    settings: DestinationPiwikPro.Settings;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const appId = 'XXX-XXX-XXX-XXX-XXX';
  const url = 'https://your_account_name.piwik.pro/';

  beforeEach(async () => {
    settings = { appId, url };

    destination = jest.requireActual('.').default;
    destination.config = { settings };

    w._paq = [];
    w._paq.push = mockFn;

    ({ elb } = await createCollector({
      session: false,
      tagging: 2,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    elb('walker destination', destination);

    expect(true).toBeTruthy(); // @TODO: Add tests
  });

  test('wrapper', async () => {
    (w._paq as unknown) = undefined;
    const onCall = jest.fn();
    destination.config.wrapper = { onCall };
    elb('walker destination', destination);
    await elb(event);
    expect(onCall).toHaveBeenCalled();
    expect(onCall).toHaveBeenCalledWith(
      { name: '_paq.push', type: 'piwikpro' },
      expect.any(Array),
    );
  });

  test('pageview', async () => {
    const page_view = getEvent('page view');
    const mockFnIgnorePageView = jest.fn();
    elb('walker destination', destination);
    elb('walker destination', {
      push: mockFnIgnorePageView,
      config: { mapping: { page: { view: { ignore: true } } } },
    });

    await elb(page_view);
    expect(mockFn).toHaveBeenCalledWith([
      'trackPageView',
      page_view.data.title,
    ]);
    expect(mockFnIgnorePageView).toHaveBeenCalledTimes(0);

    // Make sure that mockFnIgnorePageView is called for other events
    mockFn.mockClear();
    await elb('foo bar');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFnIgnorePageView).toHaveBeenCalledTimes(1);
  });

  test('event ecommerceOrder', async () => {
    const event = getEvent('order complete');
    elb('walker destination', destination, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceOrder());
  });

  test('event ecommerceAddToCart', async () => {
    const event = getEvent('product add');
    elb('walker destination', destination, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceAddToCart());
  });

  test('event ecommerceProductDetailView', async () => {
    const event = getEvent('product view');
    elb('walker destination', destination, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceProductDetailView());
  });

  test('event ecommerceCartUpdate', async () => {
    const event = getEvent('cart view');
    elb('walker destination', destination, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceCartUpdate());
  });
});
