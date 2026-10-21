import { execFileSync } from 'child_process';
import path from 'path';
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

  it('sets the tag attributes before the script is inserted; src and the marker stay', () => {
    const src = nextSrc();
    // Watching the head: an attribute set after the insertion would show.
    const observer = new MutationObserver(() => undefined);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    loadVendor(src, get, {
      attributes: {
        'data-domain': 'example.com',
        src: 'https://other.example/x.js',
        [VENDOR_SCRIPT_MARKER]: 'taken',
      },
    });
    const records = observer.takeRecords();
    observer.disconnect();

    expect(records.map(({ type }) => type)).toEqual(['childList']);
    const [script] = scriptsOf(src);
    expect(script.getAttribute('data-domain')).toBe('example.com');
    expect(script.getAttribute('src')).toBe(src);
    expect(script.getAttribute(VENDOR_SCRIPT_MARKER)).toBe('');
  });

  it('keeps the page as the registry: a script removed from the page is injected again', () => {
    const src = nextSrc();
    loadVendor(src, get);
    loadVendor(src, get);
    expect(scriptsOf(src)).toHaveLength(1);

    scriptsOf(src).forEach((script) => script.remove());
    loadVendor(src, get);
    expect(scriptsOf(src)).toHaveLength(1);
  });

  it('injects into the document it is given, which is also the registry', () => {
    const src = nextSrc();
    const other = document.implementation.createHTMLDocument('env');
    loadVendor(src, get, { document: other });
    loadVendor(src, get, { document: other });

    const injectedThere = Array.from(other.querySelectorAll('script')).filter(
      (script) => script.getAttribute('src') === src,
    );
    expect(injectedThere).toHaveLength(1);
    expect(injectedThere[0].hasAttribute(VENDOR_SCRIPT_MARKER)).toBe(true);
    expect(scriptsOf(src)).toEqual([]);
  });

  it('throws vendor-not-ready naming the src where there is no document at all', () => {
    // jsdom's global document cannot be removed: plain Node runs the source.
    const source = path.join(__dirname, '..', 'loadVendor.ts');
    const script = `
      const mod = await import(${JSON.stringify(source)});
      const { loadVendor } = mod.default ?? mod;
      try { loadVendor('https://vendor.example/sdk.js', () => undefined); }
      catch (error) { console.log(JSON.stringify({ code: error.code, message: error.message })); }
    `;
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', script],
      { cwd: __dirname, encoding: 'utf8' },
    );
    expect(JSON.parse(output)).toEqual({
      code: 'vendor-not-ready',
      message:
        'Vendor script https://vendor.example/sdk.js has no document to go into',
    });
  });

  it("adopts another bundle's script that already loaded: ready at once", async () => {
    const src = nextSrc();
    // Another bundle injected and loaded it before this one asks.
    const foreign = document.createElement('script');
    foreign.src = src;
    foreign.setAttribute(VENDOR_SCRIPT_MARKER, '');
    document.head.appendChild(foreign);
    sdk = { track: () => undefined };

    await expect(loadVendor(src, get).ready()).resolves.toBe(sdk);
    expect(scriptsOf(src)).toHaveLength(1);
  });

  it("watches another bundle's script that has not loaded yet", async () => {
    const src = nextSrc();
    const foreign = document.createElement('script');
    foreign.src = src;
    foreign.setAttribute(VENDOR_SCRIPT_MARKER, '');
    document.head.appendChild(foreign);

    const ready = loadVendor(src, get).ready();
    sdk = { track: () => undefined };
    fire(src, 'load');
    await expect(ready).resolves.toBe(sdk);
    expect(scriptsOf(src)).toHaveLength(1);
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
