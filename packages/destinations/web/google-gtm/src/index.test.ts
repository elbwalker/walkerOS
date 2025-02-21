import type { WalkerOS } from '@elbwalker/types';
import type { DestinationGoogleGTM } from '.';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import { elb, Walkerjs } from '@elbwalker/walker.js';
import { createEvent, getEvent } from '@elbwalker/utils';
import { events, mapping } from '../examples';

describe('destination google-tag-manager', () => {
  const w = window;
  let destination: DestinationGoogleGTM.Destination,
    config: DestinationGoogleGTM.Config;

  const containerId = 'GTM-XXXXXXX';
  let event: WalkerOS.Event;

  beforeEach(() => {
    config = {};

    destination = jest.requireActual('.').default;
    destination.config = config;
    event = createEvent();
    Walkerjs({ pageview: false, session: false });
    elb('walker run');
  });

  test('init', () => {
    elb('walker destination', destination);

    w.dataLayer = undefined as unknown;
    expect(w.dataLayer).toBeUndefined();

    elb(event);
    expect(w.dataLayer).toBeDefined();
  });

  test('fn', () => {
    w.dataLayer = undefined as unknown;
    const fn = jest.fn();
    elb('walker destination', destination, { fn });
    elb(event);
    expect(fn).toHaveBeenCalledTimes(2);
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
    elb(event);
    expect(w.dataLayer).toBeDefined();

    expect(mockDataLayer).toHaveBeenLastCalledWith(event);
  });

  test('event entity_action', () => {
    const event = getEvent();
    elb('walker destination', destination, { mapping: mapping.config });
    elb(event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(events.entity_action());
  });

  test('event add_to_cart', () => {
    const event = getEvent('product add');
    elb('walker destination', destination, { mapping: mapping.config });
    elb(event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(events.add_to_cart());
  });

  test('event purchase', () => {
    const event = getEvent('order complete');
    elb('walker destination', destination, { mapping: mapping.config });
    elb(event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(events.purchase());
  });
});
