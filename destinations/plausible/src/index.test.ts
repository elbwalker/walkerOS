import { DestinationPlausible } from '.';

describe('destination plausible', () => {
  const w = window;

  let elbwalker, destination: DestinationPlausible;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const script = 'https://plausible.io/js/script.manual.js';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    elbwalker = require('@elbwalker/walker.js').default;
    destination = require('.').default;

    w.elbLayer = [];
    w.plausible = mockFn;

    elbwalker.go({ custom: true });
    elbwalker.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    elbwalker.push('walker destination', destination);

    w.plausible = undefined;
    expect(w.plausible).toBeUndefined();

    elbwalker.push(event);
    expect(w.plausible).toBeDefined();
  });

  test('init with script load', () => {
    destination.config.scriptLoad = true;
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="${script}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem === null).toBe(true);
    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem !== null).toBe(true);
  });

  test('init with domain', () => {
    destination.config.scriptLoad = true;
    destination.config.domain = 'elbwalker.com';
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="${script}"]`;

    elbwalker.push(event);

    const elem = document.querySelector(scriptSelector) as HTMLScriptElement;
    expect(elem.dataset.domain).toBe('elbwalker.com');
  });

  test('push', () => {
    elbwalker.push('walker destination', destination);
    const data = { a: 1 };
    elbwalker.push(event, data, 'manual');

    expect(w.plausible).toBeDefined();
    expect(mockFn).toHaveBeenNthCalledWith(1, event, { props: data });
  });

  test('page view event', () => {
    elbwalker.push('walker destination', destination);
    const data = { a: 1 };
    elbwalker.push('page view', data);

    expect(w.plausible).toBeDefined();
    expect(mockFn).toHaveBeenNthCalledWith(1, 'pageview');
  });
});
