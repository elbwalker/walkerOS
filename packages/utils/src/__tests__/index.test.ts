import {
  debounce,
  getMarketingParameters,
  isVisible,
  storageDelete,
  storageRead,
  storageWrite,
  throttle,
  getByStringDot,
  tryCatch,
  tryCatchAsync,
  sessionStart,
  Const,
} from '../';

const w = window;

const mockFn = jest.fn(); //.mockImplementation(console.log);
const mockError = jest.fn();
console.error = mockError;

describe('Utils', () => {
  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;

    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();
  });

  test('isVisible', () => {
    const innerHeight = w.innerHeight;
    w.innerHeight = 100; // Create a small window

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

    w.innerHeight = innerHeight;
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
    storageWrite(key, value);
    expect(storageRead(key)).toBe(value);
    storageDelete(key);
    expect(storageRead(key)).toBe('');
    w.sessionStorage.setItem(key, 's');
    expect(storageRead(key)).toBe('s');

    // Local
    storageWrite(key, value, 1, Const.Utils.Storage.Local);
    expect(storageRead(key, Const.Utils.Storage.Local)).toBe(value);
    storageDelete(key, Const.Utils.Storage.Local);
    expect(storageRead(key, Const.Utils.Storage.Local)).toBe('');

    // Cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
    expect(storageWrite(key, value, 1, Const.Utils.Storage.Cookie)).toBe(value);
    storageDelete(key, Const.Utils.Storage.Cookie);
    expect(storageRead(key, Const.Utils.Storage.Cookie)).toBe('');
    expect(storageRead('foo', Const.Utils.Storage.Cookie)).toBe('');
    storageWrite(key, value, 1, Const.Utils.Storage.Cookie, 'elbwalker.com');
    expect(document.cookie).toContain('domain=elbwalker.com');

    // Expiration Session
    expect(storageWrite(key, value, 5)).toBe(value);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(w.sessionStorage.getItem(key)).toBeDefined();
    expect(storageRead(key)).toBe('');
    expect(w.sessionStorage.getItem(key)).toBeNull();

    // Expiration Local
    expect(storageWrite(key, value, 5, Const.Utils.Storage.Local)).toBe(value);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(w.localStorage.getItem(key)).toBeDefined();
    expect(storageRead(key, Const.Utils.Storage.Local)).toBe('');
    expect(w.localStorage.getItem(key)).toBeNull();

    // Expiration Cookie
    storageWrite(key, value, 5, Const.Utils.Storage.Cookie);
    expect(document.cookie).toContain('max-age=300');

    // Cast
    expect(storageWrite(key, true)).toBe(true);
  });

  test('session start', () => {
    const url = 'https://www.elbwalker.com/';
    const referrer = 'https://www.example.com/';
    Object.defineProperty(w, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
    });

    // Is new
    expect(sessionStart({ url, referrer: url, isNew: true })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Referral
    expect(sessionStart({ url, referrer })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Direct
    expect(sessionStart({ url, referrer: '' })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Predefined data
    expect(
      sessionStart({ url, referrer, data: { id: 'sessionId' } }),
    ).toStrictEqual(expect.objectContaining({ id: 'sessionId' }));

    // Marketing
    expect(sessionStart({ url: url + '?utm_campaign=foo' })).toStrictEqual(
      expect.objectContaining({
        id: expect.any(String),
        campaign: 'foo',
        marketing: true,
      }),
    );

    // Marketing with custom marketing parameter
    expect(
      sessionStart({
        url: url + '?affiliate=parameter',
        parameters: { affiliate: 'custom' },
      }),
    ).toStrictEqual(
      expect.objectContaining({
        id: expect.any(String),
        custom: 'parameter',
        marketing: true,
      }),
    );

    // Referrer with custom domains
    expect(
      sessionStart({
        url: 'https://www.elbwalker.com',
        referrer: 'https://docs.elbwalker.com',
        domains: ['docs.elbwalker.com'],
      }),
    ).toBeFalsy();
    expect(
      sessionStart({
        url: 'https://www.elbwalker.com',
        referrer: '',
        domains: [''], // Hack to disable direct or hidden referrer
      }),
    ).toBeFalsy();

    // Default url and referrer
    Object.defineProperty(document, 'referrer', {
      value: referrer,
    });
    Object.defineProperty(window, 'location', {
      value: new URL(url),
    });
    expect(sessionStart()).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Reload
    Object.defineProperty(w, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'reload' }]),
      },
    });
    expect(sessionStart()).toBeFalsy();

    // Reload with marketing parameter
    expect(sessionStart({ url: url + '?utm_campaign=foo' })).toBeFalsy();
  });

  test('marketing parameters', () => {
    const url = 'https://www.elbwalker.com/?';
    expect(getMarketingParameters(new URL(url))).toStrictEqual({});

    expect(
      getMarketingParameters(new URL(url + 'utm_campaign=c')),
    ).toStrictEqual(expect.objectContaining({ campaign: 'c' }));
    expect(
      getMarketingParameters(new URL(url + 'utm_content=c')),
    ).toStrictEqual(expect.objectContaining({ content: 'c' }));
    expect(getMarketingParameters(new URL(url + 'dclid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'fbclid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'gclid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'utm_medium=m'))).toStrictEqual(
      expect.objectContaining({ medium: 'm' }),
    );
    expect(getMarketingParameters(new URL(url + 'msclkid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'utm_source=s'))).toStrictEqual(
      expect.objectContaining({ source: 's' }),
    );
    expect(getMarketingParameters(new URL(url + 'utm_term=t'))).toStrictEqual(
      expect.objectContaining({ term: 't' }),
    );

    // Custom parameters
    expect(
      getMarketingParameters(new URL(url + 'utm_custom=bar'), {
        utm_custom: 'foo',
      }),
    ).toStrictEqual(expect.objectContaining({ foo: 'bar' }));
  });

  test('getByStringDot', () => {
    const obj = {
      foo: 'bar',
      a: { b: 'c' },
      i: [0, 1, { id: 'dynamic' }],
    };
    expect(getByStringDot(obj, 'foo')).toBe('bar');
    expect(getByStringDot(obj, 'unknown')).toBe(undefined);
    expect(getByStringDot(obj, 'a.b')).toBe('c');
    expect(getByStringDot(obj, 'i.*.id', 2)).toBe('dynamic');
    expect(getByStringDot(undefined, 'na')).toBe(undefined);
  });

  test('tryCatch', () => {
    // Default error on console
    tryCatch(() => {
      throw new Error('foo');
    })();
    expect(mockError).toHaveBeenCalledWith(expect.any(Error));

    // Custom error handler
    const onError = jest.fn();
    tryCatch(() => {
      throw new Error('foo');
    }, onError)();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  test('tryCatchAsync', async () => {
    // Default error on console
    await tryCatchAsync(async () => {
      throw new Error('foo');
    })();
    expect(mockError).toHaveBeenCalledWith(expect.any(Error));

    // Custom error handler
    const onError = jest.fn();
    await tryCatchAsync(async () => {
      throw new Error('foo');
    }, onError)();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
