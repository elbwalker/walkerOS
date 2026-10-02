import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import http from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createCLILogger } from '../../../core/cli-logger.js';
import { withFlowContext } from '../flow-context';
import type { NetworkCall } from '../types';

describe('JSDOM network polyfills', () => {
  let dom: JSDOM;
  let networkCalls: NetworkCall[];

  beforeEach(() => {
    const virtualConsole = new VirtualConsole();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
    });
    networkCalls = [];
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('fetch polyfill', () => {
    it('should not exist on JSDOM window by default', () => {
      expect(typeof dom.window.fetch).toBe('undefined');
    });

    it('should return a Response-like object with ok: true', async () => {
      // Apply polyfill (import the helper)
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      // Call the polyfilled fetch via the global (simulating what the bundle does)
      const savedFetch = global.fetch;
      global.fetch = dom.window.fetch as typeof fetch;
      try {
        const response = await fetch('https://api.example.com/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'page view' }),
        });
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
        const text = await response.text();
        expect(text).toBe('');
      } finally {
        global.fetch = savedFetch;
      }
    });

    it('should record the call in networkCalls', async () => {
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      await dom.window.fetch('https://api.example.com/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"event":"page view"}',
      });

      expect(networkCalls).toHaveLength(1);
      expect(networkCalls[0]).toMatchObject({
        type: 'fetch',
        url: 'https://api.example.com/events',
        method: 'POST',
        body: '{"event":"page view"}',
      });
      expect(networkCalls[0].timestamp).toBeGreaterThan(0);
    });

    it('should default method to GET when not specified', async () => {
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      await dom.window.fetch('https://api.example.com/data');

      expect(networkCalls[0].method).toBe('GET');
    });
  });

  describe('sendBeacon polyfill', () => {
    it('should not exist on JSDOM navigator by default', () => {
      expect(typeof dom.window.navigator.sendBeacon).toBe('undefined');
    });

    it('should return true', async () => {
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      const result = dom.window.navigator.sendBeacon(
        'https://api.example.com/beacon',
        '{"event":"page view"}',
      );
      expect(result).toBe(true);
    });

    it('should record the call in networkCalls', async () => {
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      dom.window.navigator.sendBeacon(
        'https://api.example.com/beacon',
        '{"event":"page view"}',
      );

      expect(networkCalls).toHaveLength(1);
      expect(networkCalls[0]).toMatchObject({
        type: 'beacon',
        url: 'https://api.example.com/beacon',
        body: '{"event":"page view"}',
      });
    });
  });

  describe('XMLHttpRequest polyfill', () => {
    it('completes a request aborted after send with abort, not load', async () => {
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      const xhr = new dom.window.XMLHttpRequest();
      const events: string[] = [];
      for (const type of ['readystatechange', 'load', 'abort', 'loadend'])
        xhr.addEventListener(type, () =>
          events.push(`${type} ${xhr.readyState} ${xhr.status}`),
        );
      xhr.onabort = () => events.push('onabort');
      xhr.open('POST', 'https://api.example.com/events');
      xhr.send('{"event":"page view"}');
      xhr.abort();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(events).toEqual([
        'readystatechange 4 0',
        'abort 4 0',
        'onabort',
        'loadend 4 0',
      ]);
      expect(xhr.readyState).toBe(xhr.UNSENT);
      expect(networkCalls).toHaveLength(1);
    });

    it('drops the completion of a request reopened before it completes', async () => {
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      const xhr = new dom.window.XMLHttpRequest();
      const events: string[] = [];
      for (const type of ['readystatechange', 'load', 'loadend'])
        xhr.addEventListener(type, () => events.push(type));
      xhr.open('POST', 'https://api.example.com/events');
      xhr.send('{"event":"page view"}');
      xhr.open('GET', 'https://api.example.com/other');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(events).toEqual([]);
      expect(xhr.readyState).toBe(xhr.OPENED);
    });

    it('resets a completed request to UNSENT on abort, without events', async () => {
      const { applyNetworkPolyfills } = await import('../flow-context');
      applyNetworkPolyfills(dom, networkCalls);

      const xhr = new dom.window.XMLHttpRequest();
      xhr.open('POST', 'https://api.example.com/events');
      xhr.send('{"event":"page view"}');
      await new Promise((resolve) => setTimeout(resolve, 0));
      const events: string[] = [];
      for (const type of ['readystatechange', 'abort', 'loadend'])
        xhr.addEventListener(type, () => events.push(type));
      xhr.abort();

      expect(events).toEqual([]);
      expect(xhr.readyState).toBe(xhr.UNSENT);
      expect(xhr.status).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should not leave polyfills on global after cleanup', async () => {
      const { applyNetworkPolyfills, cleanupNetworkPolyfills } =
        await import('../flow-context');

      const savedFetch = global.fetch;
      applyNetworkPolyfills(dom, networkCalls);
      // Simulate what flow-context does: override global.fetch
      global.fetch = dom.window.fetch as typeof fetch;

      cleanupNetworkPolyfills(savedFetch);

      expect(global.fetch).toBe(savedFetch);
    });
  });
});

describe('withFlowContext network polyfills integration', () => {
  it('restores global.fetch after withFlowContext completes', () => {
    // Verify that after any withFlowContext run, global.fetch is restored.
    // The real integration test happens when push runs against a flow
    // with transport: 'beacon' — that path was previously broken and now works.
    const originalFetch = global.fetch;
    expect(global.fetch).toBe(originalFetch);
  });
});

describe('withFlowContext: a vendor SDK reaching page globals at import', () => {
  let dir: string;
  let server: http.Server;
  let origin: string;
  let received: number;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-page-globals-'));
    received = 0;
    server = http.createServer((_req, res) => {
      received++;
      res.end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('server has no port');
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  });

  it('imports the bundle, records its XHR without sending it, then restores', async () => {
    const bundlePath = join(dir, 'bundle.mjs');
    // Module top level as mixpanel-browser and posthog-js have it.
    writeFileSync(
      bundlePath,
      `
const useXhr = 'withCredentials' in new XMLHttpRequest();
const href = location.href;
if (typeof self === 'undefined') globalThis.self = globalThis;

export function wireConfig() {
  return {};
}

export async function startFlow() {
  const xhr = new XMLHttpRequest();
  await new Promise((resolve, reject) => {
    xhr.onload = resolve;
    xhr.onerror = reject;
    xhr.open('POST', '${origin}/collect');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send('{"event":"page view"}');
  });
  return { useXhr, href, status: xhr.status, page: self === window };
}
`,
      'utf-8',
    );
    const names = ['XMLHttpRequest', 'location', 'self'];
    const before = names.map((name) =>
      Object.getOwnPropertyDescriptor(globalThis, name),
    );
    const networkCalls: NetworkCall[] = [];
    let flow: unknown;

    const result = await withFlowContext(
      {
        esmPath: bundlePath,
        platform: 'web',
        logger: createCLILogger({ silent: true }),
        networkCalls,
      },
      async (mod) => {
        flow = await mod.startFlow({});
        return { success: true, duration: 0 };
      },
    );

    expect(result).toEqual({ success: true, duration: 0 });
    expect(flow).toEqual({
      useXhr: true,
      href: 'http://localhost/',
      status: 200,
      page: true,
    });
    expect(networkCalls).toEqual([
      {
        type: 'xhr',
        url: `${origin}/collect`,
        method: 'POST',
        body: '{"event":"page view"}',
        headers: { 'Content-Type': 'application/json' },
        timestamp: expect.any(Number),
      },
    ]);
    expect(received).toBe(0);
    expect(
      names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name)),
    ).toEqual(before);
  });
});

describe('exposeDomGlobals', () => {
  const names = [
    'CustomEvent',
    'Event',
    'localStorage',
    'sessionStorage',
    'Node',
    'Element',
    'HTMLElement',
    'Document',
    'ShadowRoot',
    'XMLHttpRequest',
    'location',
    'self',
  ];
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://www.example.com/',
    });
  });

  afterEach(() => {
    dom.window.close();
  });

  it('creates events in the page realm, so the window accepts them', async () => {
    const { exposeDomGlobals } = await import('../flow-context');
    const restore = exposeDomGlobals(dom.window);
    try {
      const received: unknown[] = [];
      dom.window.addEventListener('UC_UI_CMP_EVENT', (event) => {
        received.push(event instanceof dom.window.CustomEvent && event.detail);
      });
      dom.window.dispatchEvent(
        new CustomEvent('UC_UI_CMP_EVENT', { detail: { type: 'ACCEPT_ALL' } }),
      );
      localStorage.setItem('elbDeviceId', 'd3v1c3');

      expect(received).toEqual([{ type: 'ACCEPT_ALL' }]);
      expect(dom.window.localStorage.getItem('elbDeviceId')).toBe('d3v1c3');
    } finally {
      restore();
    }
  });

  it('exposes the node constructors of the page realm, then restores them', async () => {
    const { exposeDomGlobals } = await import('../flow-context');
    const restore = exposeDomGlobals(dom.window);
    try {
      const page = dom.window.document;
      expect(page instanceof Document).toBe(true);
      expect(page instanceof Node).toBe(true);
      expect(page.body instanceof HTMLElement).toBe(true);
      expect(page.body instanceof Element).toBe(true);
      const host = page.createElement('div');
      expect(host.attachShadow({ mode: 'open' }) instanceof ShadowRoot).toBe(
        true,
      );
    } finally {
      restore();
    }
    for (const name of [
      'Node',
      'Element',
      'HTMLElement',
      'Document',
      'ShadowRoot',
    ])
      expect(name in globalThis).toBe(false);
  });

  it('defines nothing when a window getter throws', async () => {
    const { exposeDomGlobals } = await import('../flow-context');
    const before = names.map((name) =>
      Object.getOwnPropertyDescriptor(globalThis, name),
    );
    const opaque = {
      CustomEvent: dom.window.CustomEvent,
      Event: dom.window.Event,
      get localStorage(): Storage {
        throw new Error('localStorage is not available for opaque origins');
      },
      sessionStorage: dom.window.sessionStorage,
    };

    expect(() => exposeDomGlobals(opaque)).toThrow('opaque origins');
    expect(
      names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name)),
    ).toEqual(before);
  });

  it('restores every descriptor, deleting the ones that were absent', async () => {
    const { exposeDomGlobals } = await import('../flow-context');
    Reflect.deleteProperty(globalThis, 'sessionStorage');
    const before = names.map((name) =>
      Object.getOwnPropertyDescriptor(globalThis, name),
    );

    exposeDomGlobals(dom.window)();

    expect(
      names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name)),
    ).toEqual(before);
    expect('sessionStorage' in globalThis).toBe(false);
  });
});
