import webClient, { type WebClient } from '@elbwalker/walker.js';
import type { Config, Function } from './types';

describe('destination google-tag-manager', () => {
  const w = window;
  let elbwalker: WebClient.Function, destination: Function, config: Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const containerId = 'GTM-XXXXXXX';
  const event = 'entity action';
  const version = { client: expect.any(String), tagging: expect.any(Number) };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    destination = require('./index').default;

    w.elbLayer = [];
    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockFn;

    elbwalker = webClient({ pageview: false });
    elbwalker.push('walker run');
  });

  test('init', () => {
    elbwalker.push('walker destination', destination);

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
    const w = window as any;
    const customLayer = 'customLayer';

    elbwalker.push('walker destination', destination, {
      custom: { dataLayer: customLayer },
    });

    expect(w[customLayer]).toBeFalsy();

    elbwalker.push(event);

    expect(w[customLayer]).toBeTruthy();
  });

  test('push', () => {
    elbwalker.push('walker destination', destination);
    elbwalker.push(event, { a: 1 }, 'manual');
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
