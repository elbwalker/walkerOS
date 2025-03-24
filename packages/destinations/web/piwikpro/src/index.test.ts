import type { Elb } from '@elbwalker/walker.js';
import type { DestinationPiwikPro } from '.';
import { createSourceWalkerjs } from '@elbwalker/walker.js';
import { getEvent } from '@elbwalker/utils';
import { events, mapping } from '../examples';

describe('Destination PiwikPro', () => {
  let elb: Elb.Fn;
  const w = window;
  let destination: DestinationPiwikPro.Destination,
    custom: DestinationPiwikPro.Custom;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const appId = 'XXX-XXX-XXX-XXX-XXX';
  const url = 'https://your_account_name.piwik.pro/';

  beforeEach(() => {
    custom = { appId, url };

    destination = jest.requireActual('.').default;
    destination.config = { custom };

    w._paq = [];
    w._paq.push = mockFn;

    ({ elb } = createSourceWalkerjs({
      pageview: false,
      run: true,
      session: false,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    elb('walker destination', destination);

    expect(true).toBeTruthy(); // @TODO: Add tests
  });

  test('fn', async () => {
    (w._paq as unknown) = undefined;
    const fn = jest.fn();
    destination.config.fn = fn;
    elb('walker destination', destination);
    await elb(event);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('pageview', async () => {
    const page_view = getEvent('page view');
    elb('walker destination', destination);

    await elb(page_view);
    expect(mockFn).toHaveBeenCalledWith([
      'trackPageView',
      page_view.data.title,
    ]);

    jest.clearAllMocks();
    destination.config.mapping = { page: { view: { ignore: true } } };
    await elb(page_view);
    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test('event ecommerceOrder', async () => {
    const event = getEvent('order complete');
    elb('walker destination', destination, {
      custom,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceOrder());
  });

  test('event ecommerceAddToCart', async () => {
    const event = getEvent('product add');
    elb('walker destination', destination, {
      custom,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceAddToCart());
  });

  test('event ecommerceProductDetailView', () => {
    const event = getEvent('product view');
    elb('walker destination', destination, {
      custom,
      mapping: mapping.config,
    });
    elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceProductDetailView());
  });

  test('event ecommerceCartUpdate', () => {
    const event = getEvent('cart view');
    elb('walker destination', destination, {
      custom,
      mapping: mapping.config,
    });
    elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceCartUpdate());
  });
});
