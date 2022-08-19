import { Elbwalker } from '@elbwalker/types';
import { DestinationPlausible } from '.';

const w = window;

let elbwalker: Elbwalker.Function;
let destination: DestinationPlausible;
const mockFn = jest.fn(); //.mockImplementation(console.log);

const event = 'entity action';

describe('destination plausible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    elbwalker = require('../../elbwalker').default;
    destination = require('./index').destination;

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

    const script = 'https://plausible.io/js/script.js';
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

    const script = 'https://plausible.io/js/script.js';
    const scriptSelector = `script[src="${script}"]`;

    elbwalker.push(event);

    const elem = document.querySelector(scriptSelector) as HTMLScriptElement;
    expect(elem.dataset.domain).toBe('elbwalker.com');
  });

  test('push', () => {
    elbwalker.push('walker destination', destination);
    elbwalker.push(event, { a: 1 }, 'manual');

    expect(w.plausible).toBeDefined();
    expect(mockFn).toHaveBeenNthCalledWith(1, event);
  });
});
