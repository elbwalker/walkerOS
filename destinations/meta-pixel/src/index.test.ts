import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationMeta } from '.';

describe('Destination Meta Pixel', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationMeta.Function,
    config: DestinationMeta.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const pixelId = '1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    config = {
      custom: { pixelId },
    };

    destination = require('.').default;
    destination.config = config;

    w.elbLayer = [];
    w.fbq = mockFn;

    elbwalker = Elbwalker();
    elbwalker.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    (w.fbq as any) = undefined;

    expect(w.fbq).not.toBeDefined();

    elbwalker.push('walker destination', destination);

    elbwalker.push(event);
    expect(w.fbq).toBeDefined();
  });

  test('Init calls', () => {
    elbwalker.push('walker destination', destination);

    elbwalker.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'init', pixelId);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="https://connect.facebook.net/en_US/fbevents.js"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('push', () => {
    // Missing mapping
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);
    expect(mockFn).toHaveBeenCalledWith('trackCustom', event);
  });
});
