import { isObject } from '@walkeros/core';
import fixture from './fixtures/push.product-view.json';

// The entry as a page runs it: loaded as a side-effect module, fresh per load,
// with a real collector behind it. Every assertion reads window.dataLayer.

const LOADED = Symbol.for('@walkeros/walker.js');

const load = () =>
  jest.isolateModules(() => {
    jest.requireActual('../index');
  });

// One dispatch spans a dozen or so microtask turns and a replayed backlog
// serializes one per entry; this bound settles all of them.
const settle = async (): Promise<void> => {
  for (let i = 0; i < 200; i++) await Promise.resolve();
};

const pushes = (): Record<string, unknown>[] => {
  const value: unknown = Reflect.get(window, 'dataLayer');
  return Array.isArray(value) ? value.filter(isObject) : [];
};
const named = (name: string) => pushes().filter((push) => push.event === name);
const events = () => pushes().map((push) => push.event);

const setReferrer = (value: string) =>
  Object.defineProperty(document, 'referrer', { value, configurable: true });

const setReadyState = (value: DocumentReadyState) =>
  Object.defineProperty(document, 'readyState', {
    value,
    configurable: true,
  });

beforeEach(() => {
  Reflect.deleteProperty(window, 'dataLayer');
  Reflect.deleteProperty(window, 'elbLayer');
  Reflect.deleteProperty(window, 'elb');
  Reflect.deleteProperty(window, LOADED);
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
  setReferrer('');
});

afterEach(async () => {
  // Hand back what the flow holds on the page: listeners and the history
  // methods.
  const elb: unknown = Reflect.get(window, 'elb');
  if (typeof elb === 'function') await elb('walker shutdown');
  Reflect.deleteProperty(document, 'readyState');
  Reflect.deleteProperty(window.history, 'pushState');
  Reflect.deleteProperty(window.history, 'replaceState');
});

describe('the entry', () => {
  // The happy path writes no storage, no cookie and no console line: checked
  // after every test of this group.
  let setItem: jest.SpyInstance;
  let setCookie: jest.SpyInstance;
  let logs: jest.SpyInstance[];

  beforeEach(() => {
    setItem = jest.spyOn(Storage.prototype, 'setItem');
    setCookie = jest.spyOn(document, 'cookie', 'set');
    logs = [
      jest.spyOn(console, 'log'),
      jest.spyOn(console, 'info'),
      jest.spyOn(console, 'debug'),
    ];
  });

  afterEach(() => {
    expect(setItem).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
    logs.forEach((log) => expect(log).not.toHaveBeenCalled());
    jest.restoreAllMocks();
  });

  it('waits for the DOM before the page view', async () => {
    setReadyState('loading');
    load();
    await settle();
    expect(named('page view')).toHaveLength(0);
    setReadyState('complete');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await settle();
    expect(named('page view')).toHaveLength(1);
  });

  it('pushes a tagged click', async () => {
    document.body.innerHTML =
      '<div data-elb="product" data-elb-product="name:Cotton Tee;price:25" data-elbaction="click:add"><button id="b">Add</button></div>';
    load();
    await settle();
    document.getElementById('b')?.click();
    await settle();
    expect(named('product add')).toEqual([
      expect.objectContaining({
        event: 'product add',
        data: { name: 'Cotton Tee', price: 25 },
        _clear: true,
      }),
    ]);
  });

  // The quoted param holds the separator, so it must stay one param. Only the
  // entity filter makes a param observable: with `product` after it, the click
  // reaches the product entity once instead of falling back to the page.
  it('keeps a quoted action param with a semicolon in one param', async () => {
    document.body.innerHTML =
      '<div data-elb="product" data-elb-product="name:Cotton Tee" data-elbaction="click:add(\'x;y\', product)"><button id="b">Add</button></div>';
    load();
    await settle();
    document.getElementById('b')?.click();
    await settle();
    expect(events().filter((event) => String(event).endsWith(' add'))).toEqual([
      'product add',
    ]);
  });

  // The browser source replays a backlog before the run's page view.
  it('delivers calls queued before load, before the page view', async () => {
    Reflect.set(window, 'elbLayer', [
      ['walker user', { id: 'u1' }],
      ['order complete', { total: 1 }],
    ]);
    load();
    await settle();
    expect(events()).toEqual(['session start', 'order complete', 'page view']);
    expect(named('order complete')).toEqual([
      expect.objectContaining({ user: { id: 'u1' } }),
    ]);
  });

  it('delivers calls made between load and DOM ready', async () => {
    setReadyState('loading');
    load();
    const elb: unknown = Reflect.get(window, 'elb');
    if (typeof elb === 'function') elb('order complete', { total: 2 });
    setReadyState('complete');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await settle();
    expect(named('order complete')).toEqual([
      expect.objectContaining({ data: { total: 2 } }),
    ]);
  });

  it('starts once when included twice', async () => {
    load();
    load();
    await settle();
    expect(named('page view')).toHaveLength(1);
  });

  it('starts a session in window mode on a campaign landing', async () => {
    window.history.replaceState({}, '', '/?utm_source=x');
    load();
    await settle();
    expect(named('session start')).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          storage: false,
          id: expect.stringMatching(/^.{16}$/),
        }),
      }),
    ]);
  });

  it('starts no session on an internal visit', async () => {
    setReferrer('https://example.com/previous');
    load();
    await settle();
    expect(named('session start')).toHaveLength(0);
    expect(named('page view')).toHaveLength(1);
  });

  it('follows a single-page app route change', async () => {
    setReferrer('https://other.example/');
    load();
    await settle();
    expect(events()).toEqual(['session start', 'page view']);
    window.history.pushState({}, '', '/next');
    await settle();
    const views = named('page view');
    expect(views).toHaveLength(2);
    expect(views[1]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ id: '/next' }),
      }),
    );
    expect(named('session start')).toHaveLength(1);
  });
});

// Volatile fields replaced by placeholders, so the push shape is comparable.
const stabilize = (push: Record<string, unknown>): Record<string, unknown> => {
  const stable: Record<string, unknown> = { ...push };
  for (const key of ['id', 'timestamp', 'timing', 'source', 'count', 'group'])
    if (key in stable) stable[key] = `<${key}>`;
  return stable;
};

it('pushes the documented product view', async () => {
  document.body.setAttribute('data-elbglobals', 'pagetype:product');
  document.body.innerHTML =
    '<div data-elb="product" data-elb-product="name:Cotton Tee;price:25" data-elbaction="load:view"></div>';
  load();
  await settle();
  const [push] = named('product view');
  expect(stabilize(push)).toEqual(fixture);
});
