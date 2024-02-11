import webClient, { type WebClient } from '@elbwalker/walker.js';
import type { Function } from './types';

describe('Destination PiwikPro', () => {
  const w = window;
  let walkerjs: WebClient.Instance, destination: Function;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const appId = 'XXX-XXX-XXX-XXX-XXX';
  const url = 'https://your_account_name.piwik.pro/';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    destination = require('.').default;

    w.elbLayer = [];
    w._paq = [];
    w._paq.push = mockFn;

    walkerjs = webClient();
    walkerjs.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    destination.config = {
      custom: { appId, url },
    };
    walkerjs.push('walker destination', destination);

    expect(true).toBeTruthy();
  });

  test.skip('push', () => {
    walkerjs.push('walker destination', destination);
    walkerjs.push(event);
    // expect(mockFn).toHaveBeenNthCalledWith(1, event);
  });
});
