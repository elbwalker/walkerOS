import { Const } from '@walkerOS/core';
import { storageDelete, storageRead, storageWrite } from '..';

describe('Storage', () => {
  const w = window;

  beforeEach(() => {});

  test('Storage', async () => {
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
});
