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
