/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://shop.example.com/page"}
 */
import {
  MOIN_PARAM,
  MOIN_PRODUCTION,
  moin,
  runMoin,
  type MoinGlobals,
  type MoinTarget,
} from '../moin';

const T: MoinTarget = {
  app: 'https://app.test',
  base: 'https://cdn.test/tag-mode/',
};
const FILE = 'A'.repeat(64);
const GUARD = Symbol.for('walkeros.moin');

let listen: jest.SpyInstance;

function setSearch(search: string) {
  window.history.replaceState({}, '', `/page${search}`);
}

function ping(origin: string, data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { origin, data }));
}

function messageListeners(): unknown[] {
  return listen.mock.calls
    .filter(([type]) => type === 'message')
    .map(([, listener]) => listener);
}

function scripts(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll('script'));
}

beforeEach(() => {
  setSearch('');
  sessionStorage.clear();
  Reflect.deleteProperty(window, GUARD);
  document.head.innerHTML = '';
  listen = jest.spyOn(window, 'addEventListener');
});

afterEach(() => {
  // Listeners outlive a test on the shared jsdom window: drop every one the
  // loader added, so a later ping reaches only the loader under test.
  for (const [type, listener] of listen.mock.calls)
    if (type === 'message') window.removeEventListener(type, listener);
  jest.restoreAllMocks();
});

describe('the frozen contract', () => {
  it('names the parameter elbMoin', () => {
    expect(MOIN_PARAM).toBe('elbMoin');
  });

  it('trusts only the production app and loads from the production base', () => {
    expect(MOIN_PRODUCTION).toEqual({
      app: 'https://app.walkeros.io',
      base: 'https://cdn.walkeros.io/tag-mode/',
    });
  });
});

describe('arming', () => {
  it('stays off without the parameter or the tab flag', () => {
    const write = jest.spyOn(Storage.prototype, 'setItem');
    moin(T);
    expect(messageListeners()).toHaveLength(0);
    expect(write).not.toHaveBeenCalled();
    expect(Reflect.get(window, GUARD)).toBeUndefined();
    ping(T.app, { elbMoin: 1, file: FILE });
    expect(scripts()).toHaveLength(0);
  });

  it('arms on ?elbMoin and sets the tab flag', () => {
    setSearch('?elbMoin');
    moin(T);
    expect(messageListeners()).toHaveLength(1);
    expect(sessionStorage.getItem('elbMoin')).toBe('1');
    expect(Reflect.get(window, GUARD)).toBe(true);
  });

  it('arms on ?elbMoin with any value beside other parameters', () => {
    setSearch('?utm_source=x&elbMoin=anything');
    moin(T);
    expect(messageListeners()).toHaveLength(1);
  });

  it('arms on the tab flag alone', () => {
    sessionStorage.setItem('elbMoin', '1');
    moin(T);
    expect(messageListeners()).toHaveLength(1);
  });

  it('stays off on a tab flag other than "1"', () => {
    sessionStorage.setItem('elbMoin', 'true');
    moin(T);
    expect(messageListeners()).toHaveLength(0);
  });

  describe('where storage is denied', () => {
    const own = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

    beforeEach(() => {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get() {
          throw new DOMException('denied', 'SecurityError');
        },
      });
    });

    afterEach(() => {
      if (own) Object.defineProperty(window, 'sessionStorage', own);
    });

    it('arms by the parameter alone', () => {
      setSearch('?elbMoin');
      moin(T);
      expect(messageListeners()).toHaveLength(1);
      ping(T.app, { elbMoin: 1, file: FILE });
      expect(scripts()).toHaveLength(1);
    });

    it('stays off without the parameter', () => {
      moin(T);
      expect(messageListeners()).toHaveLength(0);
    });
  });

  describe('frames', () => {
    // A frame window: the parameter is present, so only the top check decides.
    function frame(top: 'self' | 'other') {
      const addEventListener = jest.fn();
      const frameWindow: MoinGlobals['window'] = {
        top: null,
        location: { search: '?elbMoin' },
        sessionStorage: window.sessionStorage,
        addEventListener,
        removeEventListener: jest.fn(),
      };
      frameWindow.top = top === 'self' ? frameWindow : window;
      runMoin({ window: frameWindow, URLSearchParams }, T);
      return addEventListener;
    }

    it('stays off in a sub-frame', () => {
      expect(frame('other')).not.toHaveBeenCalled();
    });

    it('arms the same window when it is the top frame', () => {
      expect(frame('self')).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('broken globals', () => {
    class BrokenParams {
      constructor() {
        throw new Error('broken polyfill');
      }
      has(): boolean {
        return false;
      }
    }

    const fail = (): never => {
      throw new Error('broken page');
    };

    function broken(part: 'params' | 'top' | 'listener'): MoinGlobals {
      const frameWindow: MoinGlobals['window'] = {
        top: null,
        location: { search: '?elbMoin' },
        sessionStorage: window.sessionStorage,
        addEventListener: part === 'listener' ? fail : jest.fn(),
        removeEventListener: jest.fn(),
      };
      if (part === 'top')
        Object.defineProperty(frameWindow, 'top', { get: fail });
      else frameWindow.top = frameWindow;
      return {
        window: frameWindow,
        URLSearchParams: part === 'params' ? BrokenParams : URLSearchParams,
      };
    }

    it.each(['params', 'top', 'listener'] as const)(
      'never throws when %s throws',
      (part) => {
        expect(() => runMoin(broken(part), T)).not.toThrow();
      },
    );
  });

  it('lets only the first loader on a page arm', () => {
    setSearch('?elbMoin');
    moin(T);
    moin({ app: 'https://other.test', base: 'https://cdn.other.test/x/' });
    expect(messageListeners()).toHaveLength(1);
    ping('https://other.test', { elbMoin: 1, file: FILE });
    expect(scripts()).toHaveLength(0);
  });
});

describe('the ping', () => {
  beforeEach(() => setSearch('?elbMoin'));

  it('loads the named script with integrity from the same hash', () => {
    const file = 'ab-_'.repeat(16);
    moin(T);
    ping(T.app, { elbMoin: 1, file });
    const [script, ...rest] = scripts();
    expect(rest).toHaveLength(0);
    expect(script.getAttribute('src')).toBe(`${T.base}${file}.js`);
    expect(script.getAttribute('integrity')).toBe(
      `sha384-${'ab+/'.repeat(16)}`,
    );
    expect(script.getAttribute('crossorigin')).toBe('anonymous');
    expect(script.async).toBe(true);
    expect(script.parentNode).toBe(document.head);
  });

  it('accepts only the first ping', () => {
    const drop = jest.spyOn(window, 'removeEventListener');
    moin(T);
    ping(T.app, { elbMoin: 1, file: FILE });
    ping(T.app, { elbMoin: 1, file: 'B'.repeat(64) });
    expect(scripts()).toHaveLength(1);
    expect(drop).toHaveBeenCalledWith('message', messageListeners()[0]);
  });

  it('trusts the production target by default', () => {
    moin();
    ping(T.app, { elbMoin: 1, file: FILE });
    expect(scripts()).toHaveLength(0);
    ping('https://app.walkeros.io', { elbMoin: 1, file: FILE });
    expect(scripts().map((script) => script.getAttribute('src'))).toEqual([
      `https://cdn.walkeros.io/tag-mode/${FILE}.js`,
    ]);
  });

  it.each<[string, string, unknown]>([
    ['a wrong origin', 'https://evil.test', { elbMoin: 1, file: FILE }],
    [
      'an origin with a lookalike suffix',
      'https://app.test.evil.net',
      { elbMoin: 1, file: FILE },
    ],
    ['the app origin over http', 'http://app.test', { elbMoin: 1, file: FILE }],
    [
      'the app origin with a trailing slash',
      'https://app.test/',
      { elbMoin: 1, file: FILE },
    ],
    ['an opaque origin', 'null', { elbMoin: 1, file: FILE }],
    ['an empty origin', '', { elbMoin: 1, file: FILE }],
    ['not an object', T.app, 'elbMoin'],
    ['null data', T.app, null],
    ['an array', T.app, [1, FILE]],
    ['elbMoin true', T.app, { elbMoin: true, file: FILE }],
    ['elbMoin "1"', T.app, { elbMoin: '1', file: FILE }],
    ['elbMoin missing', T.app, { file: FILE }],
    ['file missing', T.app, { elbMoin: 1 }],
    ['file a number', T.app, { elbMoin: 1, file: 1 }],
    ['../', T.app, { elbMoin: 1, file: '../' + 'A'.repeat(61) }],
    ['%2e%2e/', T.app, { elbMoin: 1, file: '%2e%2e/' + 'A'.repeat(57) }],
    ['.%2E/', T.app, { elbMoin: 1, file: '.%2E/' + 'A'.repeat(59) }],
    ['backslash', T.app, { elbMoin: 1, file: '..\\' + 'A'.repeat(61) }],
    ['x/../../', T.app, { elbMoin: 1, file: 'x/../../' + 'A'.repeat(56) }],
    ['..%2f', T.app, { elbMoin: 1, file: '..%2f' + 'A'.repeat(59) }],
    ['query', T.app, { elbMoin: 1, file: 'a?b' + 'A'.repeat(61) }],
    ['fragment', T.app, { elbMoin: 1, file: 'a#b' + 'A'.repeat(61) }],
    ['a dot', T.app, { elbMoin: 1, file: 'A'.repeat(63) + '.' }],
    ['base64 padding', T.app, { elbMoin: 1, file: 'A'.repeat(63) + '=' }],
    ['a trailing newline', T.app, { elbMoin: 1, file: FILE + '\n' }],
    ['63 chars', T.app, { elbMoin: 1, file: 'A'.repeat(63) }],
    ['65 chars', T.app, { elbMoin: 1, file: 'A'.repeat(65) }],
    ['empty', T.app, { elbMoin: 1, file: '' }],
  ])('ignores %s and keeps listening', (_label, origin, data) => {
    moin(T);
    ping(origin, data);
    expect(scripts()).toHaveLength(0);
    ping(T.app, { elbMoin: 1, file: FILE });
    expect(scripts()).toHaveLength(1);
  });
});
