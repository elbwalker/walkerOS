import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationPlausible } from '.';

describe('destination plausible', () => {
  const w = window;
  let destination: DestinationPlausible.Destination;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const script = 'https://plausible.io/js/script.manual.js';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('.').default;

    w.elbLayer = [];
    w.plausible = mockFn;

    Walkerjs({ pageview: false });
    elb('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    elb('walker destination', destination);

    w.plausible = undefined;
    expect(w.plausible).toBeUndefined();

    elb(event);
    expect(w.plausible).toBeDefined();
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
    expect(mockFn).toHaveBeenNthCalledWith(1, event, { props: data });
  });
});
