import type { DestinationPiwikPro } from '.';
import { elb, Walkerjs } from '@elbwalker/walker.js';
import { getEvent } from '@elbwalker/utils';

describe('Destination PiwikPro', () => {
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

    Walkerjs({ pageview: false, run: true, session: false });
  });

  afterEach(() => {});

  test('init', () => {
    elb('walker destination', destination);

    expect(true).toBeTruthy();
  });

  test('fn', () => {
    (w._paq as unknown) = undefined;
    const fn = jest.fn();
    destination.config.fn = fn;
    elb('walker destination', destination);
    elb(event);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('pageview', () => {
    const page_view = getEvent('page view');
    elb('walker destination', destination);

    elb(page_view);
    expect(mockFn).toHaveBeenCalledWith([
      'trackPageView',
      page_view.data.title,
    ]);

    jest.clearAllMocks();
    destination.config.mapping = { page: { view: { ignore: true } } };
    elb(page_view);
    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test.skip('event trackEcommerceOrder', () => {
    const order_complete = getEvent('order complete');
    elb('walker destination', destination, {
      custom,
      mapping: {
        order: {
          complete: {
            name: 'trackEcommerceOrder',
            data: [
              'data.id',
              'data.total',
              {
                fn: (event) => {
                  const total = Number(event.data?.total ?? 0);
                  const taxes = Number(event.data?.taxes ?? 0);
                  const shipping = Number(event.data?.shipping ?? 0);

                  return total - taxes - shipping;
                },
              },
            ],
          },
        },
      },
    });

    elb(order_complete);
    expect(mockFn).toHaveBeenCalledWith([
      'trackEcommerceOrder',
      order_complete.data.id,
      order_complete.data.total,
      expect.any(Number),
    ]);
  });
});
