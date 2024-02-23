import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationGoogleGTM } from '.';

describe('destination google-tag-manager', () => {
  const w = window;
  let destination: DestinationGoogleGTM.Destination;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const containerId = 'GTM-XXXXXXX';
  const event = 'entity action';
  const version = { client: expect.any(String), tagging: expect.any(Number) };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    destination = jest.requireActual('./index').default;

    w.elbLayer = [];
    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockFn;

    Walkerjs({ pageview: false });
    elb('walker run');
  });

  test('init', () => {
    elb('walker destination', destination);

    w.dataLayer = undefined as unknown;
    expect(w.dataLayer).toBeUndefined();

    elb(event);
    expect(w.dataLayer).toBeDefined();
  });

  test('init with load script', () => {
    destination.config = {
      loadScript: true,
      custom: { containerId },
    };

    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtm.js?id=${containerId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('custom dataLayer name', () => {
    const customLayer = 'customLayer';

    elb('walker destination', destination, {
      custom: { dataLayer: customLayer },
    });

    expect(w[customLayer]).toBeFalsy();

    elb(event);

    expect(w[customLayer]).toBeTruthy();
  });

  test('push', () => {
    elb('walker destination', destination);
    elb(event, { a: 1 }, 'manual');
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
