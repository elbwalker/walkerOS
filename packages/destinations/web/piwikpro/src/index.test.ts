import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationPiwikPro } from '.';

describe('Destination PiwikPro', () => {
  const w = window;
  let destination: DestinationPiwikPro.Destination;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const appId = 'XXX-XXX-XXX-XXX-XXX';
  const url = 'https://your_account_name.piwik.pro/';

  beforeEach(() => {
    destination = jest.requireActual('.').default;

    w._paq = [];
    w._paq.push = mockFn;

    Walkerjs();
    elb('walker run');
  });

  afterEach(() => {});

  test('init', () => {
    destination.config = {
      custom: { appId, url },
    };
    elb('walker destination', destination);

    expect(true).toBeTruthy();
  });
});
