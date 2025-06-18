import type { WalkerOS } from '@walkerOS/types';
import type { Elb } from '@walkerOS/web';
import type { DestinationGoogleGTM } from '.';
import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { createSourceWalkerjs } from '@walkerOS/web';
import { createEvent, getEvent } from '@walkerOS/utils';
import { events, mapping } from './examples';

describe('destination google-tag-manager', () => {
  let elb: Elb.Fn;
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
    ({ elb } = createSourceWalkerjs({
      session: false,
      pageview: false,
      run: true,
    }));
  });

  test('init', async () => {
    elb('walker destination', destination);

    w.dataLayer = undefined as unknown;
    expect(w.dataLayer).toBeUndefined();

    await elb(event);
    expect(w.dataLayer).toBeDefined();
  });

  test('fn', async () => {
    w.dataLayer = undefined as unknown;
    const fn = jest.fn();
    elb('walker destination', destination, { fn });
    await elb(event);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('init with load script', async () => {
    destination.config = {
      loadScript: true,
      custom: { containerId },
    };

    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtm.js?id=${containerId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    await elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('custom dataLayer name', async () => {
    const customLayer = 'customLayer';

    elb('walker destination', destination, {
      custom: { dataLayer: customLayer },
    });

    expect(w[customLayer]).toBeFalsy();

    await elb(event);

    expect(w[customLayer]).toBeTruthy();
  });

  test('push', async () => {
    elb('walker destination', destination);
    await elb(event);
    expect(w.dataLayer).toBeDefined();

    expect(mockDataLayer).toHaveBeenLastCalledWith(event);
  });

  test('event entity_action', async () => {
    const event = getEvent();
    elb('walker destination', destination, { mapping: mapping.config });
    await elb(event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(events.entity_action());
  });

  test('event add_to_cart', async () => {
    const event = getEvent('product add');
    elb('walker destination', destination, { mapping: mapping.config });
    await elb(event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(events.add_to_cart());
  });

  test('event purchase', async () => {
    const event = getEvent('order complete');
    elb('walker destination', destination, { mapping: mapping.config });
    await elb(event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(events.purchase());
  });
});
