import type { WalkerOS } from '@walkeros/core';
import type { DestinationMatomo } from '.';
import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';

describe('Destination Matomo', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationMatomo.Destination;
  let settings: DestinationMatomo.Settings;

  const mockFn = jest.fn();

  const siteId = '1';
  const url = 'https://analytics.example.com/';

  const mockPaq: Array<unknown> = [];
  mockPaq.push = mockFn;

  const testEnv = {
    window: {
      _paq: mockPaq,
      location: { href: 'https://www.example.com/page' },
    },
    document: {
      createElement: jest.fn(() => ({
        src: '',
        type: '',
        async: false,
        defer: false,
      })),
      head: { appendChild: jest.fn() },
    },
  };

  beforeEach(async () => {
    settings = { siteId, url };
    destination = jest.requireActual('.').default;
    jest.clearAllMocks();
    ({ elb } = await startFlow({ tagging: 2 }));
  });

  test('init with loadScript loads matomo.js and configures tracker', async () => {
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, {
      settings,
      loadScript: true,
    });
    // Trigger init via a push
    await elb(getEvent('page view'));

    expect(mockFn).toHaveBeenCalledWith(['setTrackerUrl', url + 'matomo.php']);
    expect(mockFn).toHaveBeenCalledWith(['setSiteId', siteId]);
    expect(mockFn).toHaveBeenCalledWith(['enableLinkTracking']);
  });

  test('init with disableCookies calls disableCookies', async () => {
    settings.disableCookies = true;
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, { settings });
    await elb(getEvent('page view'));

    expect(mockFn).toHaveBeenCalledWith(['disableCookies']);
  });

  test('init with enableHeartBeatTimer configures timer', async () => {
    settings.enableHeartBeatTimer = 30;
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, { settings });
    await elb(getEvent('page view'));

    expect(mockFn).toHaveBeenCalledWith(['enableHeartBeatTimer', 30]);
  });

  test('pageview', async () => {
    const pageViewEvent = getEvent('page view');
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, { settings });

    await elb(pageViewEvent);
    expect(mockFn).toHaveBeenCalledWith([
      'trackPageView',
      pageViewEvent.data.title,
    ]);
  });
});
