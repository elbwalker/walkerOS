import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationGA4 } from '.';

describe('Destination Google GA4', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationGA4.Function,
    config: DestinationGA4.Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const data = { foo: 'bar' };
  const trigger = 'manual';
  const measurementId = 'G-XXXXXX-1';
  const transport_url = 'https://collect.example.com';

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    config = {
      custom: { measurementId },
    };

    destination = require('.').default;
    destination.config = config;

    w.elbLayer = [];
    w.dataLayer = [];

    elbwalker = Elbwalker({ custom: true });
    elbwalker.push('walker run');
    w.gtag = mockFn;
  });

  test('Init', () => {
    (w.dataLayer as any) = undefined;
    (w.gtag as any) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    destination.config = config;
    elbwalker.push('walker destination', destination);
    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elbwalker.push(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();

    expect(w.dataLayer?.length).toBe(3);
  });

  test('Init calls', () => {
    destination.config = config;
    elbwalker.push('walker destination', destination);

    elbwalker.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', measurementId, {});
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('Push', () => {
    elbwalker.push('walker destination', destination);
    elbwalker.push(event, data, trigger);

    Object.assign(data, { send_to: measurementId });
    expect(mockFn).toHaveBeenCalledWith('event', event, data);
  });

  test('Settings', () => {
    config.custom.transport_url = transport_url;
    destination.config = config;

    elbwalker.push('walker destination', destination);
    elbwalker.push(event, data, trigger);

    Object.assign(data, { send_to: measurementId });

    expect(mockFn).toHaveBeenCalledWith('config', measurementId, {
      transport_url,
    });

    expect(mockFn).toHaveBeenCalledWith('event', event, data);
  });
});
