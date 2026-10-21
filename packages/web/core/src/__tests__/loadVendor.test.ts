import { DEFAULT_DESTINATION_TIMEOUT_MS } from '@walkeros/core';
import { loadVendor, VENDOR_SCRIPT_MARKER } from '../loadVendor';

describe('loadVendor', () => {
  let n = 0;
  // One src per test: the injected scripts are remembered per page.
  const nextSrc = () => `https://vendor.example/sdk-${++n}.js`;
  const scriptsOf = (src: string) =>
    Array.from(document.querySelectorAll('script')).filter(
      (script) => script.getAttribute('src') === src,
    );
  const fire = (src: string, type: 'load' | 'error') =>
    scriptsOf(src).forEach((script) => script.dispatchEvent(new Event(type)));

  interface Sdk {
    track(): void;
  }
  let sdk: Sdk | undefined;
  const get = () => sdk;

  beforeEach(() => {
    sdk = undefined;
  });

  it('injects one marked script per src, however often ready() is called', () => {
    const src = nextSrc();
    const vendor = loadVendor(src, get);
    vendor.ready().catch(() => undefined);
    vendor.ready().catch(() => undefined);
    loadVendor(src, get)
      .ready()
      .catch(() => undefined);

    const scripts = scriptsOf(src);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].hasAttribute(VENDOR_SCRIPT_MARKER)).toBe(true);
    expect(scripts[0].async).toBe(true);
  });

  it('resolves with get() after load', async () => {
    const src = nextSrc();
    const ready = loadVendor(src, get).ready();
    sdk = { track: () => undefined };
    fire(src, 'load');
    await expect(ready).resolves.toBe(sdk);
  });

  it('rejects vendor-not-loaded after error, final for the page', async () => {
    const src = nextSrc();
    const vendor = loadVendor(src, get);
    const ready = vendor.ready();
    fire(src, 'error');

    await expect(ready).rejects.toMatchObject({
      code: 'vendor-not-loaded',
      retryable: false,
    });
    sdk = { track: () => undefined };
    await expect(vendor.ready()).rejects.toMatchObject({
      code: 'vendor-not-loaded',
    });
    await expect(loadVendor(src, get).ready()).rejects.toMatchObject({
      code: 'vendor-not-loaded',
    });
    expect(() => vendor.check()).toThrow(
      expect.objectContaining({ code: 'vendor-not-loaded' }),
    );
    expect(scriptsOf(src)).toHaveLength(1);
  });

  it('check() passes while the script loads and after it loaded', () => {
    const src = nextSrc();
    const vendor = loadVendor(src, get);
    expect(() => vendor.check()).not.toThrow();
    fire(src, 'load');
    expect(() => vendor.check()).not.toThrow();
  });

  it('rejects vendor-not-ready when the script loaded but get() stays empty', async () => {
    const src = nextSrc();
    const ready = loadVendor(src, get).ready();
    fire(src, 'load');
    await expect(ready).rejects.toMatchObject({
      code: 'vendor-not-ready',
      retryable: true,
    });
  });

  it('rejects vendor-timeout at the resolved deadline, then checks get() on each call', async () => {
    const src = nextSrc();
    const vendor = loadVendor(src, get, { timeout: 500 });
    const ready = vendor.ready();

    jest.advanceTimersByTime(499);
    sdk = { track: () => undefined };
    jest.advanceTimersByTime(1);
    await expect(ready).rejects.toMatchObject({
      code: 'vendor-timeout',
      retryable: true,
    });

    // Past the deadline: synchronous checks, no new script.
    await expect(vendor.ready()).resolves.toBe(sdk);
    sdk = undefined;
    await expect(vendor.ready()).rejects.toMatchObject({
      code: 'vendor-not-ready',
    });
    expect(scriptsOf(src)).toHaveLength(1);
  });

  it('uses the default destination timeout without one', async () => {
    const src = nextSrc();
    const ready = loadVendor(src, get).ready();
    jest.advanceTimersByTime(DEFAULT_DESTINATION_TIMEOUT_MS - 1);
    sdk = { track: () => undefined };
    fire(src, 'load');
    await expect(ready).resolves.toBe(sdk);
  });

  it('without src checks get() on each call, with no deadline and no script', async () => {
    const before = document.querySelectorAll('script').length;
    const vendor = loadVendor(undefined, get);

    await expect(vendor.ready()).rejects.toMatchObject({
      code: 'vendor-not-ready',
    });
    jest.advanceTimersByTime(DEFAULT_DESTINATION_TIMEOUT_MS * 2);
    sdk = { track: () => undefined };
    await expect(vendor.ready()).resolves.toBe(sdk);
    expect(document.querySelectorAll('script')).toHaveLength(before);
  });
});
