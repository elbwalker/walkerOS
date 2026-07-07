import { getEnv } from '../environment';
import type { Env } from '../types/destination';

function makeRecorder() {
  const records: Array<{ fn: string; args: unknown[] }> = [];
  const record = (fn: string, args: unknown[]) => {
    records.push({ fn, args });
  };
  return { records, record };
}

// Read a property off an unknown value, guarding the navigable case so the
// proxied deep path can be traversed without casts.
function read(value: unknown, key: string): unknown {
  if (value !== null && typeof value === 'object')
    return Reflect.get(value, key);
  return undefined;
}

describe('getEnv observe wrapping', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'gtag');
    Reflect.deleteProperty(window, 'customDL');
  });

  it('leaves env untouched when no recorder is present (fast-path identity)', () => {
    expect(getEnv<Env>({}).window).toBe(window);
  });

  it('records and forwards a resolved leaf call without mutating the real global', () => {
    const { records, record } = makeRecorder();
    const realDataLayer: unknown[] = [];
    const originalGtag = (...args: unknown[]) => {
      realDataLayer.push(args);
    };
    Reflect.set(window, 'gtag', originalGtag);

    const wrapped = getEnv<Env>({
      observe: { paths: ['window.gtag'], record },
    }).window.gtag;

    expect(typeof wrapped).toBe('function');
    expect(wrapped).not.toBe(originalGtag);

    if (typeof wrapped === 'function') wrapped('event', 'test', { a: 1 });

    expect(records).toEqual([
      { fn: 'window.gtag', args: ['event', 'test', { a: 1 }] },
    ]);
    expect(realDataLayer).toEqual([['event', 'test', { a: 1 }]]);
    expect(Reflect.get(window, 'gtag')).toBe(originalGtag);
  });

  it('returns undefined for a missing leaf without throwing or recording', () => {
    const { records, record } = makeRecorder();

    const value = getEnv<Env>({
      observe: { paths: ['window.doesNotExist'], record },
    }).window.doesNotExist;

    expect(value).toBeUndefined();
    expect(records).toEqual([]);
  });

  it('passes non-tracked reads through to the real target with native brand checks', () => {
    const { record } = makeRecorder();

    const w = getEnv<Env>({
      observe: { paths: ['window.gtag'], record },
    }).window;

    expect(w.document).toBe(document);
    expect(w.location).toBe(location);
  });

  it('lets writes through the proxy land on the real target', () => {
    const { record } = makeRecorder();

    const w = getEnv<Env>({
      observe: { paths: ['window.gtag'], record },
    }).window;

    Reflect.set(w, 'customDL', ['x']);

    expect(Reflect.get(window, 'customDL')).toEqual(['x']);
  });

  it('returns a memoized wrapper across reads', () => {
    const { record } = makeRecorder();
    Reflect.set(window, 'gtag', () => undefined);

    const w = getEnv<Env>({
      observe: { paths: ['window.gtag'], record },
    }).window;

    expect(w.gtag).toBe(w.gtag);
  });

  it('strips the observe key from the returned env', () => {
    const { record } = makeRecorder();

    const env = getEnv<Env>({ observe: { paths: ['window.gtag'], record } });

    expect('observe' in env).toBe(false);
  });

  it('records through intermediate proxies for a deep path', () => {
    const { records, record } = makeRecorder();
    const leaf = () => undefined;

    const env = getEnv<Env>({
      observe: { paths: ['window.a.b.c'], record },
      window: { a: { b: { c: leaf } } },
    });

    const c = read(read(read(env.window, 'a'), 'b'), 'c');

    expect(typeof c).toBe('function');
    if (typeof c === 'function') c('deep', 1);

    expect(records).toEqual([{ fn: 'window.a.b.c', args: ['deep', 1] }]);
  });
});
