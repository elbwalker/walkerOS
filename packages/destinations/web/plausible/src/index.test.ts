import webClient from '@elbwalker/client-web';
import type { WebClient } from '@elbwalker/client-web';
import type { Config, Function } from './types';

describe('destination plausible', () => {
  const w = window;
  let elbwalker: WebClient.Function, destination: Function, config: Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const script = 'https://plausible.io/js/script.manual.js';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    elbwalker = require('@elbwalker/client-web').default;
    destination = require('.').default;

    w.elbLayer = [];
    w.plausible = mockFn;

    elbwalker = webClient({ pageview: false });
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
    destination.config.loadScript = true;
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="${script}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem === null).toBe(true);
    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem !== null).toBe(true);
  });

  test('init with domain', () => {
    const domain = 'elbwalker.com';
    destination.config = {
      loadScript: true,
      custom: { domain },
    };
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="${script}"]`;

    elbwalker.push(event);

    const elem = document.querySelector(scriptSelector) as HTMLScriptElement;
    expect(elem.dataset.domain).toBe(domain);
  });

  test('push', () => {
    elbwalker.push('walker destination', destination);
    const data = { a: 1 };
    elbwalker.push(event, data, 'manual');

    expect(w.plausible).toBeDefined();
    expect(mockFn).toHaveBeenNthCalledWith(1, event, { props: data });
  });
});
