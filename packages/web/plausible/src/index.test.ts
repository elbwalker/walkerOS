import type { Elb } from '@walkerOS/web';
import type { DestinationPlausible } from '.';
import { createWalkerjsWeb } from '@walkerOS/web';
import { getEvent } from '@walkerOS/utils';
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

    ({ elb } = createWalkerjsWeb({
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

  test('fn', async () => {
    const fn = jest.fn();
    destination.config.fn = fn;
    elb('walker destination', destination);
    await elb(event);
    expect(fn).toHaveBeenCalledTimes(1);
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
      custom: { domain },
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
