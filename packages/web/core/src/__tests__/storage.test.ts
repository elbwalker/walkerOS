import { storageRead, storageWrite, storageDelete } from '..';

describe('Storage env injection', () => {
  const createMockStorage = () => {
    const store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      store,
    };
  };

  test('storageWrite/storageRead use env.window for local storage', () => {
    const mockLocal = createMockStorage();
    const env = {
      window: {
        localStorage: mockLocal,
        sessionStorage: createMockStorage(),
      } as unknown as Window & typeof globalThis,
    };

    storageWrite('key', 'value', 30, 'local', undefined, env);
    expect(mockLocal.setItem).toHaveBeenCalled();

    const result = storageRead('key', 'local', env);
    expect(mockLocal.getItem).toHaveBeenCalledWith('key');
    expect(result).toBe('value');
  });

  test('storageWrite/storageRead use env.window for session storage', () => {
    const mockSession = createMockStorage();
    const env = {
      window: {
        localStorage: createMockStorage(),
        sessionStorage: mockSession,
      } as unknown as Window & typeof globalThis,
    };

    storageWrite('key', 'value', 30, 'session', undefined, env);
    expect(mockSession.setItem).toHaveBeenCalled();

    const result = storageRead('key', 'session', env);
    expect(mockSession.getItem).toHaveBeenCalledWith('key');
    expect(result).toBe('value');
  });

  test('storageDelete uses env.window', () => {
    const mockSession = createMockStorage();
    const env = {
      window: {
        localStorage: createMockStorage(),
        sessionStorage: mockSession,
      } as unknown as Window & typeof globalThis,
    };

    storageWrite('key', 'value', 30, 'session', undefined, env);
    storageDelete('key', 'session', env);
    expect(mockSession.removeItem).toHaveBeenCalledWith('key');
  });

  test('storageWrite/storageRead use env.document for cookies', () => {
    let cookieJar = '';
    const env = {
      document: {
        get cookie() {
          return cookieJar;
        },
        set cookie(val: string) {
          cookieJar = val;
        },
      } as unknown as Document,
    };

    storageWrite('ck', 'val', 30, 'cookie', undefined, env);
    expect(cookieJar).toContain('ck=val');

    const result = storageRead('ck', 'cookie', env);
    expect(result).toBe('val');
  });

  test('functions fall back to globals when env is undefined', () => {
    // This verifies backwards compatibility — no env = use globals
    // jsdom provides window.localStorage/sessionStorage
    storageWrite('fallback', 'test', 1, 'session');
    const result = storageRead('fallback', 'session');
    expect(result).toBe('test');
    storageDelete('fallback', 'session');
  });
});

describe('Storage error handling', () => {
  const throwing = (name: string) => () => {
    throw new DOMException('Storage disabled', name);
  };

  const throwingStorage = (kind: 'read' | 'write' | 'delete' | 'all') => ({
    getItem: jest.fn(
      kind === 'read' || kind === 'all'
        ? throwing('SecurityError')
        : () => null,
    ),
    setItem: jest.fn(
      kind === 'write' || kind === 'all'
        ? throwing('QuotaExceededError')
        : () => {},
    ),
    removeItem: jest.fn(
      kind === 'delete' || kind === 'all'
        ? throwing('SecurityError')
        : () => {},
    ),
  });

  test('storageRead returns empty string when localStorage.getItem throws', () => {
    const env = {
      window: {
        localStorage: throwingStorage('read'),
        sessionStorage: throwingStorage('read'),
      } as unknown as Window & typeof globalThis,
    };
    expect(storageRead('key', 'local', env)).toBe('');
  });

  test('storageRead returns empty string when sessionStorage.getItem throws', () => {
    const env = {
      window: {
        localStorage: throwingStorage('read'),
        sessionStorage: throwingStorage('read'),
      } as unknown as Window & typeof globalThis,
    };
    expect(storageRead('key', 'session', env)).toBe('');
  });

  test('storageWrite does not throw on QuotaExceededError', () => {
    const env = {
      window: {
        localStorage: throwingStorage('write'),
        sessionStorage: throwingStorage('write'),
      } as unknown as Window & typeof globalThis,
    };
    expect(() =>
      storageWrite('k', 'v', 30, 'local', undefined, env),
    ).not.toThrow();
    expect(() =>
      storageWrite('k', 'v', 30, 'session', undefined, env),
    ).not.toThrow();
  });

  test('storageWrite returns empty string when write fails', () => {
    const env = {
      window: {
        localStorage: throwingStorage('all'),
        sessionStorage: throwingStorage('all'),
      } as unknown as Window & typeof globalThis,
    };
    expect(storageWrite('k', 'v', 30, 'local', undefined, env)).toBe('');
    expect(storageWrite('k', 'v', 30, 'session', undefined, env)).toBe('');
  });

  test('storageDelete does not throw on SecurityError', () => {
    const env = {
      window: {
        localStorage: throwingStorage('delete'),
        sessionStorage: throwingStorage('delete'),
      } as unknown as Window & typeof globalThis,
    };
    expect(() => storageDelete('k', 'local', env)).not.toThrow();
    expect(() => storageDelete('k', 'session', env)).not.toThrow();
  });

  test('cookie storageWrite does not throw when document.cookie setter throws', () => {
    const env = {
      document: {
        get cookie() {
          return '';
        },
        set cookie(_val: string) {
          throw new DOMException('Cookies disabled', 'SecurityError');
        },
      } as unknown as Document,
    };
    expect(() =>
      storageWrite('k', 'v', 30, 'cookie', undefined, env),
    ).not.toThrow();
  });
});
