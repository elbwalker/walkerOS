import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationPlausible } from '.';

describe('destination plausible', () => {
  const w = window;
  let destination: DestinationPlausible.Destination;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const script = 'https://plausible.io/js/script.manual.js';

  beforeEach(() => {
    destination = jest.requireActual('.').default;

    w.plausible = mockFn;

    Walkerjs({ pageview: false, session: false });
    elb('walker run');
  });

  afterEach(() => {});

  test('init', () => {
    elb('walker destination', destination);

    w.plausible = undefined;
    expect(w.plausible).toBeUndefined();

    elb(event);
    expect(w.plausible).toBeDefined();
  });

  test('fn', () => {
    const fn = jest.fn();
    destination.config.fn = fn;
    elb('walker destination', destination);
    elb(event);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('init with script load', () => {
    elb('walker destination', destination, { loadScript: true });

    const scriptSelector = `script[src="${script}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem === null).toBe(true);
    elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem !== null).toBe(true);
  });

  test('init with domain', () => {
    const domain = 'elbwalker.com';
    elb('walker destination', destination, {
      loadScript: true,
      custom: { domain },
    });

    const scriptSelector = `script[src="${script}"]`;

    elb(event);

    const elem = document.querySelector(scriptSelector) as HTMLScriptElement;
    expect(elem.dataset.domain).toBe(domain);
  });

  test('push', () => {
    elb('walker destination', destination);
    const data = { a: 1 };
    elb(event, data, 'manual');

    expect(w.plausible).toBeDefined();
    expect(mockFn).toHaveBeenCalledWith(event, { props: data });
  });
});
