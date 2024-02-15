import type { WebClient } from '../types';
import fs from 'fs';

describe('Browser', () => {
  const w = window;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  jest.mock('../', () => ({
    Walkerjs: mockFn,
    default: mockFn,
  }));

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

  test('initialize walkerjs on window', () => {
    w.walkerjs = undefined as unknown as WebClient.Instance;
    expect(w.walkerjs).toBeUndefined();
    jest.resetModules();
    const walkerjs = jest.requireActual('../walkerjs').default;
    expect(w.walkerjs).toEqual(walkerjs);
  });

  test('no script tag', () => {
    document.body.innerHTML = '';
    jest.requireActual('../walkerjs');

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith({});
  });

  test('default init mode default', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.removeAttribute('data-project');

    jest.requireActual('../walkerjs');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith({
      default: false,
      tagging: 1,
    });
    expect(window.document.scripts.length).toBe(1);
  });

  test('default init mode non-default', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-default', 'true');

    jest.requireActual('../walkerjs');
    expect(mockFn).toHaveBeenCalledWith({
      default: true,
      tagging: 1,
    });
  });

  test('config version', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-version', '42');

    jest.requireActual('../walkerjs');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        tagging: 42,
      }),
    );
  });
});
