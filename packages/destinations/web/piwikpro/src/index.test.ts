import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationPiwikPro } from '..';

describe('Destination PiwikPro', () => {
  const w = window;
  let destination: DestinationPiwikPro.Function;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const appId = 'XXX-XXX-XXX-XXX-XXX';
  const url = 'https://your_account_name.piwik.pro/';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('.').default;

    w.elbLayer = [];
    w._paq = [];
    w._paq.push = mockFn;

    Walkerjs();
    elb('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    destination.config = {
      custom: { appId, url },
    };
    elb('walker destination', destination);

    expect(true).toBeTruthy();
  });

  test.skip('push', () => {
    elb('walker destination', destination);
    elb(event);
    // expect(mockFn).toHaveBeenNthCalledWith(1, event);
  });
});
