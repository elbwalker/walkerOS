import type { WalkerOS } from '@walkerOS/core';
import type { DestinationGTM } from '.';
import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { createCollector } from '@walkerOS/collector';
import { createEvent, getEvent } from '@walkerOS/core';
import { destinationGTMExamples } from './examples';

const { events, mapping } = destinationGTMExamples;

describe('destination google-tag-manager', () => {
  let elb: WalkerOS.Elb;
  const w = window;
  let destination: DestinationGTM.Destination, config: DestinationGTM.Config;
  let collectorInstance: WalkerOS.Collector;

  const containerId = 'GTM-XXXXXXX';
  let event: WalkerOS.Event;

  beforeEach(async () => {
    config = {};

    destination = jest.requireActual('.').default;
    destination.config = config;
    event = createEvent();

    ({ elb } = await createCollector({
      session: false,
      tagging: 2,
    }));
  });

  test('init', async () => {
    w.dataLayer = undefined as unknown;
    expect(w.dataLayer).toBeUndefined();

    elb('walker destination', destination);
    await elb(event);
    expect(w.dataLayer).toBeDefined();
  });

  test('wrapper', async () => {
    w.dataLayer = undefined as unknown;
    const onCall = jest.fn();

    elb('walker destination', destination, { wrapper: { onCall } });
    await elb(event);

    // Verify wrapper was called (at least once for push, and potentially for init)
    expect(onCall).toHaveBeenCalledWith(
      { name: 'dataLayer.push', type: 'google-gtm' },
      [expect.any(Object)],
    );
    expect(onCall).toHaveBeenCalled();
  });

  test('init with load script', async () => {
    const scriptSelector = `script[src="https://www.googletagmanager.com/gtm.js?id=${containerId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elb('walker destination', destination, {
      loadScript: true,
      settings: { containerId },
    });
    await elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('custom dataLayer name', async () => {
    const customLayer = 'customLayer';

    expect((w as unknown as Record<string, unknown>)[customLayer]).toBeFalsy();

    elb('walker destination', destination, {
      settings: { dataLayer: customLayer },
    });
    await elb(event);

    expect((w as unknown as Record<string, unknown>)[customLayer]).toBeTruthy();
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
