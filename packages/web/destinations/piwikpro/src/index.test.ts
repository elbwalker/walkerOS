import type { WalkerOS } from '@walkeros/core';
import type { DestinationPiwikPro } from '.';
import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { examples } from './dev';

const { events, mapping } = examples;

describe('Destination PiwikPro', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationPiwikPro.Destination,
    settings: DestinationPiwikPro.Settings;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const appId = 'XXX-XXX-XXX-XXX-XXX';
  const url = 'https://your_account_name.piwik.pro/';

  const mockPaq: Array<unknown> = [];
  mockPaq.push = mockFn;

  const testEnv = {
    window: {
      _paq: mockPaq,
    },
    document: {
      createElement: jest.fn(() => ({
        src: '',
        type: '',
        async: false,
        defer: false,
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
      })),
      head: { appendChild: jest.fn() },
    },
  };

  beforeEach(async () => {
    settings = { appId, url };

    destination = jest.requireActual('.').default;

    jest.clearAllMocks();

    ({ elb } = await startFlow({
      tagging: 2,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };

    elb('walker destination', destinationWithEnv, { settings });

    expect(true).toBeTruthy(); // @TODO: Add tests
  });

  test('pageview', async () => {
    const page_view = getEvent('page view');
    const mockFnIgnorePageView = jest.fn();
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    const ignoreDestination = {
      push: mockFnIgnorePageView,
      config: {},
    };

    elb('walker destination', destinationWithEnv, { settings });
    elb('walker destination', ignoreDestination, {
      mapping: { page: { view: { ignore: true } } },
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
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceOrder());
  });

  test('event ecommerceAddToCart', async () => {
    const event = getEvent('product add');
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceAddToCart());
  });

  test('event ecommerceProductDetailView', async () => {
    const event = getEvent('product view');
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceProductDetailView());
  });

  test('event ecommerceCartUpdate', async () => {
    const event = getEvent('cart view');
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings,
      mapping: mapping.config,
    });
    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.ecommerceCartUpdate());
  });
});
