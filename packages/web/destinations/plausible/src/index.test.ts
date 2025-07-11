import type { Elb } from '@walkerOS/web-collector';
import type { DestinationPlausible } from '.';
import { createWebCollector } from '@walkerOS/web-collector';
import { getEvent } from '@walkerOS/core';
import { destinationPlausibleExamples } from './examples';

const { events, mapping } = destinationPlausibleExamples;

describe('destination plausible', () => {
  let elb: Elb.Fn;
  const w = window;
  let destination: DestinationPlausible.Destination;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const script = 'https://plausible.io/js/script.manual.js';

  beforeEach(() => {
    destination = jest.requireActual('.').default;

    w.plausible = mockFn;

    ({ elb } = createWebCollector({
      pageview: false,
      run: true,
      session: false,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    elb('walker destination', destination);

    w.plausible = undefined;
    expect(w.plausible).toBeUndefined();

    await elb(event);
    expect(w.plausible).toBeDefined();
  });

  test('wrapper', async () => {
    const onCall = jest.fn();
    destination.config.wrapper = { onCall };
    elb('walker destination', destination);
    await elb(event);
    expect(onCall).toHaveBeenCalled();
    expect(onCall).toHaveBeenCalledWith(
      { name: 'plausible', id: expect.any(String), type: 'plausible' },
      expect.any(Array),
    );
  });

  test('init with script load', async () => {
    elb('walker destination', destination, { loadScript: true });

    const scriptSelector = `script[src="${script}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem === null).toBe(true);
    await elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem !== null).toBe(true);
  });

  test('init with domain', async () => {
    const domain = 'elbwalker.com';
    elb('walker destination', destination, {
      loadScript: true,
      settings: { domain },
    });

    const scriptSelector = `script[src="${script}"]`;

    await elb(event);

    const elem = document.querySelector(scriptSelector) as HTMLScriptElement;
    expect(elem.dataset.domain).toBe(domain);
  });

  test('event entity action', async () => {
    elb('walker destination', destination, {
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.customEvent());
  });

  test('event purchase', async () => {
    const event = getEvent('order complete');
    elb('walker destination', destination, {
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.purchase());
  });
});
