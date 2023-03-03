import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationPiwikPro } from './types';

describe('Destination PiwikPro', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationPiwikPro.Function,
    config: DestinationPiwikPro.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = require('.').default;

    w.elbLayer = [];
    w._paq = mockFn;

    elbwalker = Elbwalker();
    elbwalker.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    destination.config = {
      custom: {},
    };
    elbwalker.push('walker destination', destination);

    expect(true).toBeTruthy();
  });

  test('push', () => {
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);
    // expect(mockFn).toHaveBeenNthCalledWith(1, event);
  });
});
