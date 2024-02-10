import webClient, { type WebClient } from '@elbwalker/walker.js';
import type { Function } from './types';

describe('destination plausible', () => {
  const w = window;
  let walkerjs: WebClient.Instance, destination: Function;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const script = 'https://plausible.io/js/script.manual.js';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    walkerjs = require('@elbwalker/walker.js').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    destination = require('.').default;

    w.elbLayer = [];
    w.plausible = mockFn;

    walkerjs = webClient({ pageview: false });
    walkerjs.push('walker run');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('init', () => {
    walkerjs.push('walker destination', destination);

    w.plausible = undefined;
    expect(w.plausible).toBeUndefined();

    walkerjs.push(event);
    expect(w.plausible).toBeDefined();
  });

  test('init with script load', () => {
    destination.config.loadScript = true;
    walkerjs.push('walker destination', destination);

    const scriptSelector = `script[src="${script}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem === null).toBe(true);
    walkerjs.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem !== null).toBe(true);
  });

  test('init with domain', () => {
    const domain = 'elbwalker.com';
    destination.config = {
      loadScript: true,
      custom: { domain },
    };
    walkerjs.push('walker destination', destination);

    const scriptSelector = `script[src="${script}"]`;

    walkerjs.push(event);

    const elem = document.querySelector(scriptSelector) as HTMLScriptElement;
    expect(elem.dataset.domain).toBe(domain);
  });

  test('push', () => {
    walkerjs.push('walker destination', destination);
    const data = { a: 1 };
    walkerjs.push(event, data, 'manual');

    expect(w.plausible).toBeDefined();
    expect(mockFn).toHaveBeenNthCalledWith(1, event, { props: data });
  });
});
