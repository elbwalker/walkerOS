// The entry as a page opened for Tag Mode runs it: the loader arms before the
// DOM is ready and trusts only the production app.

const LOADED = Symbol.for('@walkeros/walker.js');
const GUARD = Symbol.for('walkeros.moin');
const FILE = 'A'.repeat(64);

const load = () =>
  jest.isolateModules(() => {
    jest.requireActual('../index');
  });

const ping = (origin: string) =>
  window.dispatchEvent(
    new MessageEvent('message', { origin, data: { elbMoin: 1, file: FILE } }),
  );

let listen: jest.SpyInstance;

beforeEach(() => {
  Reflect.deleteProperty(window, LOADED);
  Reflect.deleteProperty(window, GUARD);
  Reflect.deleteProperty(window, 'elb');
  Reflect.deleteProperty(window, 'elbLayer');
  sessionStorage.clear();
  document.head.innerHTML = '';
  // The flow waits for the DOM, so only the loader runs in these tests.
  Object.defineProperty(document, 'readyState', {
    value: 'loading',
    configurable: true,
  });
  listen = jest.spyOn(window, 'addEventListener');
});

afterEach(() => {
  for (const [type, listener] of listen.mock.calls)
    if (type === 'message') window.removeEventListener(type, listener);
  Reflect.deleteProperty(document, 'readyState');
  window.history.replaceState({}, '', '/');
});

const messageListeners = () =>
  listen.mock.calls.filter(([type]) => type === 'message');

it('arms before the DOM is ready on a page opened with ?elbMoin', () => {
  window.history.replaceState({}, '', '/?elbMoin');
  load();
  expect(messageListeners()).toHaveLength(1);

  ping('https://evil.example');
  expect(document.querySelector('script')).toBeNull();

  ping('https://app.walkeros.io');
  expect(document.querySelector('script')?.getAttribute('src')).toBe(
    `https://cdn.walkeros.io/tag-mode/${FILE}.js`,
  );
});

it('stays off on a page opened without it', () => {
  load();
  expect(messageListeners()).toHaveLength(0);
  expect(sessionStorage.getItem('elbMoin')).toBeNull();
});

describe('a page whose globals throw', () => {
  const ownParams = Object.getOwnPropertyDescriptor(window, 'URLSearchParams');
  const ownStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

  afterEach(() => {
    if (ownParams) Object.defineProperty(window, 'URLSearchParams', ownParams);
    if (ownStorage) Object.defineProperty(window, 'sessionStorage', ownStorage);
  });

  it.each(['URLSearchParams', 'sessionStorage'])(
    'keeps the bundle running when %s throws',
    (name) => {
      window.history.replaceState({}, '', '/?elbMoin');
      Object.defineProperty(window, name, {
        configurable: true,
        get() {
          throw new Error('broken page');
        },
      });
      expect(load).not.toThrow();
      expect(typeof Reflect.get(window, 'elb')).toBe('function');
    },
  );
});
