import {
  debounce,
  elb,
  getItem,
  isVisible,
  removeItem,
  setItem,
  throttle,
} from '../lib/utils';
import { Utils } from '../types';

const w = window;

const mockFn = jest.fn(); //.mockImplementation(console.log);

describe('Utils', () => {
  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;

    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();
  });

  test('elb', () => {
    w.elbLayer = undefined as any;
    elb('e a');
    expect(w.elbLayer).toBeDefined;

    w.elbLayer.push = mockFn;
    elb('e a');
    expect(mockFn).toBeCalledWith(expect.objectContaining(['e a']));
  });

  test('isVisible', () => {
    const innerHeight = window.innerHeight;
    window.innerHeight = 100; // Create a small window

    let x = 25,
      y = 25,
      width = 50,
      height = 50,
      top = 10,
      right = 25,
      bottom = 25,
      left = 25;

    // Create a mocked element
    const elem = document.createElement('div');
    Object.defineProperty(elem, 'offsetWidth', {
      value: width,
      writable: true,
    });
    Object.defineProperty(elem, 'offsetHeight', {
      value: height,
      writable: true,
    });
    Object.defineProperty(elem, 'clientHeight', {
      value: height,
      writable: true,
    });
    elem.getBoundingClientRect = jest.fn(() => ({
      x,
      y,
      width,
      height,
      top,
      right,
      bottom,
      left,
      toJSON: jest.fn,
    }));
    document.elementFromPoint = (x: number, y: number) => {
      return elem;
    };
    document.body.appendChild(elem);

    expect(isVisible(elem)).toBeTruthy();

    elem.style.display = 'none';
    expect(isVisible(elem)).toBeFalsy();
    elem.style.display = 'block';
    expect(isVisible(elem)).toBeTruthy();

    elem.style.visibility = 'hidden';
    expect(isVisible(elem)).toBeFalsy();
    elem.style.visibility = 'visible';
    expect(isVisible(elem)).toBeTruthy();

    elem.style.opacity = '0.0';
    expect(isVisible(elem)).toBeFalsy();
    elem.style.opacity = '1';
    expect(isVisible(elem)).toBeTruthy();

    Object.defineProperty(elem, 'clientHeight', {
      value: 250,
      writable: true,
    });
    expect(isVisible(elem)).toBeTruthy();

    window.innerHeight = innerHeight;
  });

  test('throttle', () => {
    const fn = throttle(mockFn, 50);

    fn();
    expect(mockFn).toHaveBeenCalled();
    jest.clearAllMocks();

    fn();
    expect(mockFn).not.toHaveBeenCalled();
    jest.clearAllMocks();

    jest.advanceTimersByTime(50);

    fn();
    expect(mockFn).toHaveBeenCalled();
    jest.clearAllMocks();

    jest.advanceTimersByTime(50);

    fn('arg');
    expect(mockFn).toHaveBeenCalledWith('arg');
  });

  test('debounce', async () => {
    let fn = debounce(mockFn);

    fn();
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(mockFn).toHaveBeenCalled();

    jest.clearAllMocks();
    fn = debounce(mockFn, 50);

    fn();
    expect(mockFn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(49);
    expect(mockFn).not.toHaveBeenCalled();
    fn();
    jest.advanceTimersByTime(2);
    expect(mockFn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(mockFn).toHaveBeenCalled();

    fn('arg');
    jest.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledWith('arg');
  });

  test('storage', async () => {
    const key = 'id';
    const value = 'abc';

    // Session
    setItem(key, value);
    expect(getItem(key)).toBe(value);
    removeItem(key);
    expect(getItem(key)).toBe('');
    w.sessionStorage.setItem(key, 's');
    expect(getItem(key)).toBe('s');

    // Local
    setItem(key, value, 1, Utils.Storage.Type.Local);
    expect(getItem(key, Utils.Storage.Type.Local)).toBe(value);
    removeItem(key, Utils.Storage.Type.Local);
    expect(getItem(key, Utils.Storage.Type.Local)).toBe('');

    // Cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
    setItem(key, value, 1, Utils.Storage.Type.Cookie);
    expect(getItem(key, Utils.Storage.Type.Cookie)).toBe(value);
    removeItem(key, Utils.Storage.Type.Cookie);
    expect(getItem(key, Utils.Storage.Type.Cookie)).toBe('');
    expect(getItem('foo', Utils.Storage.Type.Cookie)).toBe('');
    setItem(key, value, 1, Utils.Storage.Type.Cookie, 'elbwalker.com');
    expect(document.cookie).toContain('domain=elbwalker.com');

    // Expiration Session
    setItem(key, value, 5);
    expect(getItem(key)).toBe(value);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(w.sessionStorage.getItem(key)).toBeDefined();
    expect(getItem(key)).toBe('');
    expect(w.sessionStorage.getItem(key)).toBeNull();

    // Expiration Local
    setItem(key, value, 5, Utils.Storage.Type.Local);
    expect(getItem(key, Utils.Storage.Type.Local)).toBe(value);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(w.localStorage.getItem(key)).toBeDefined();
    expect(getItem(key, Utils.Storage.Type.Local)).toBe('');
    expect(w.localStorage.getItem(key)).toBeNull();

    // Expiration Cookie
    setItem(key, value, 5, Utils.Storage.Type.Cookie);
    expect(document.cookie).toContain('max-age=300');

    // Cast
    setItem(key, true);
    expect(getItem(key)).toBe(true);
  });
});
