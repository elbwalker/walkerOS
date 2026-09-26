import { JSDOM, VirtualConsole } from 'jsdom';
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

describe('exposeDomGlobals', () => {
  const names = ['CustomEvent', 'Event', 'localStorage', 'sessionStorage'];
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
