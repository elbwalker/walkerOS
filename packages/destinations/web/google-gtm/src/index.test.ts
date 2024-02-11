import webClient, { type WebClient } from '@elbwalker/walker.js';
import type { Function } from './types';

describe('destination google-tag-manager', () => {
  const w = window;
  let walkerjs: WebClient.Instance, destination: Function;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const containerId = 'GTM-XXXXXXX';
  const event = 'entity action';
  const version = { client: expect.any(String), tagging: expect.any(Number) };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    destination = require('./index').default;

    w.elbLayer = [];
    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockFn;

    walkerjs = webClient({ pageview: false });
    walkerjs.push('walker run');
  });

  test('init', () => {
    walkerjs.push('walker destination', destination);

    w.dataLayer = undefined as unknown;
    expect(w.dataLayer).toBeUndefined();

    walkerjs.push(event);
    expect(w.dataLayer).toBeDefined();
  });

  test('init with load script', () => {
    destination.config = {
      loadScript: true,
      custom: { containerId },
    };

    walkerjs.push('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtm.js?id=${containerId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    walkerjs.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('custom dataLayer name', () => {
    const w = window as Window;
    const customLayer = 'customLayer';

    walkerjs.push('walker destination', destination, {
      custom: { dataLayer: customLayer },
    });

    expect(w[customLayer]).toBeFalsy();

    walkerjs.push(event);

    expect(w[customLayer]).toBeTruthy();
  });

  test('push', () => {
    walkerjs.push('walker destination', destination);
    walkerjs.push(event, { a: 1 }, 'manual');
    expect(w.dataLayer).toBeDefined();
    expect(mockFn).toHaveBeenLastCalledWith({
      event,
      data: { a: 1 },
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: {},
      id: expect.any(String),
      trigger: 'manual',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
      version,
      source: {
        type: 'web',
        id: expect.any(String),
        previous_id: expect.any(String),
      },
      walker: true,
    });
  });
});
