import { IElbwalker } from '../types';
import fs from 'fs';

describe('Browser', () => {
  const w = window;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  jest.mock('../elbwalker', () => {
    return mockFn;
  });

  const html: string = fs
    .readFileSync(__dirname + '/html/index.html')
    .toString();

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    document.body.innerHTML = html;

    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('initialize elbwalker on window', () => {
    w.elbwalker = undefined as unknown as IElbwalker.Function;
    expect(w.elbwalker).toBeUndefined();
    jest.resetModules();
    jest.requireActual('../modules/browser');
    const elbwalker = require('../elbwalker').default;
    expect(w.elbwalker).toEqual(elbwalker);
  });

  test('no script tag', () => {
    document.body.innerHTML = '';
    jest.requireActual('../modules/browser');

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith({});
  });

  test('default init mode', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.removeAttribute('data-project');

    jest.requireActual('../modules/browser');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith({
      default: false,
      version: 1,
    });
    expect(window.document.scripts.length).toBe(1);
  });

  test('default init mode', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-default', 'true');

    jest.requireActual('../modules/browser');
    expect(mockFn).toHaveBeenCalledWith({
      default: true,
      version: 1,
    });
  });

  test('config version', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-version', '42');

    jest.requireActual('../modules/browser');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 42,
      }),
    );
  });
});
