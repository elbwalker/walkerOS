import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationGTM } from '.';

describe('destination google-tag-manager', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationGTM.Function,
    config: DestinationGTM.Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const containerId = 'GTM-XXXXXXX';
  const event = 'entity action';
  const version = { config: 0, walker: expect.any(Number) };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    destination = require('./index').destination;

    w.elbLayer = [];
    w.dataLayer = [];
    w.dataLayer.push = mockFn;

    elbwalker = Elbwalker();
    elbwalker.push('walker run');
    elbwalker.push('walker destination', destination);
  });

  test('init', () => {
    w.dataLayer = undefined as any;
    expect(w.dataLayer).toBeUndefined();

    elbwalker.push(event);
    expect(w.dataLayer).toBeDefined();
  });

  test('init with load script', () => {
    destination.config = {
      loadScript: true,
      custom: { containerId },
    };

    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtm.js?id=${containerId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('custom dataLayer name', () => {
    const customLayer = 'customLayer';
    destination.config = {
      custom: { dataLayer: customLayer },
    };

    elbwalker.push('walker destination', destination);

    expect(window[customLayer]).toBeFalsy();

    elbwalker.push(event);

    expect(window[customLayer]).toBeTruthy();
  });

  test('push', () => {
    elbwalker.push(event, { a: 1 }, 'manual');
    expect(w.dataLayer).toBeDefined();
    expect(mockFn).toHaveBeenLastCalledWith({
      event,
      data: { a: 1 },
      context: {},
      globals: {},
      user: {},
      nested: [],
      id: expect.any(String),
      trigger: 'manual',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 2,
      version,
      walker: true,
    });
  });
});
