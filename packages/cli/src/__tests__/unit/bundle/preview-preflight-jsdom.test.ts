/**
 * Tasks 15 + 15b: jsdom-based integration tests for the preview preflight
 * block emitted by generateWrapEntry.
 *
 * Because the generated entry is an ESM module that imports from a skeleton
 * file, we can't run it end-to-end in jsdom. Instead, we extract the IIFE
 * body and wrap it in a script that provides mock startFlow / wireConfig /
 * __configData on the window so we can observe which path executes.
 */

import { JSDOM, VirtualConsole } from 'jsdom';
import { generateWrapEntry } from '../../../commands/bundle/bundler.js';

/**
 * Extract the IIFE body from the generated entry code so we can evaluate it
 * in jsdom without ESM import resolution.
 *
 * The generated code looks like:
 *   import { startFlow, wireConfig, __configData } from '...';
 *   (async () => { ... })();
 *
 * We strip the import line and replace the IIFE with a plain async function
 * call that uses window globals for startFlow/wireConfig/__configData.
 */
function extractEvaluableScript(entry: string): string {
  // Remove the import line
  const withoutImport = entry.replace(
    /^import \{[^}]+\} from '[^']+';?\n*/m,
    '',
  );

  // Replace the IIFE so it uses globals instead of imports
  return `
    // Provide mock globals
    var startFlow = window.__mockStartFlow;
    var wireConfig = window.__mockWireConfig;
    var __configData = window.__mockConfigData;

    ${withoutImport}
  `;
}

/**
 * @param loadResources - When false, jsdom performs NO external resource
 *   loading, so an injected preview <script> never fires load/error on its
 *   own. Tests asserting on the swap outcome pass false and dispatch the
 *   load/error event themselves (or let the preflight's own timer fire),
 *   keeping the outcome deterministic instead of racing jsdom's real network
 *   attempt against the fake CDN URL.
 */
function createDom(url = 'https://example.com', loadResources = true): JSDOM {
  const virtualConsole = new VirtualConsole();
  // Suppress jsdom errors about script loading (the preview script URL is fake)
  virtualConsole.on('jsdomError', () => {});
  return new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url,
    runScripts: 'dangerously',
    ...(loadResources ? { resources: 'usable' as const } : {}),
    virtualConsole,
  });
}

describe('Preview preflight jsdom integration', () => {
  describe('production path (no preview token)', () => {
    it('calls startFlow when no elbPreview cookie or param exists', async () => {
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      const dom = createDom('https://example.com/page');
      const win = dom.window;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      // Wait for the async IIFE to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(startFlowCalled).toBe(true);
      // No preview script should have been injected
      const scripts = win.document.querySelectorAll('head > script[src]');
      expect(scripts.length).toBe(0);

      win.close();
    });
  });

  describe('preview path (valid elbPreview param)', () => {
    it('injects preview script and does NOT call startFlow', async () => {
      const token = 'k9x2m4p7abcd'; // 12 chars (matches preview service)
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      const dom = createDom(`https://example.com/page?elbPreview=${token}`);
      const win = dom.window;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};
      // Mock HEAD probe as 200 so the self-heal preflight proceeds to inject
      (win as unknown as Record<string, unknown>).fetch = () =>
        Promise.resolve({ ok: true, status: 200 });

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      // Wait for the async IIFE to settle
      await new Promise((r) => setTimeout(r, 50));

      // startFlow must NOT have been called (the return; exits the IIFE)
      expect(startFlowCalled).toBe(false);

      // A preview script should have been injected into <head>
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(1);
      expect((injected[0] as HTMLScriptElement).src).toBe(
        `https://cdn.walkeros.io/preview/proj_abc/walker.${token}.js`,
      );

      // The token should also be stored in a cookie
      expect(win.document.cookie).toContain(`elbPreview=${token}`);

      win.close();
    });
  });

  describe('preview cookie persistence', () => {
    it('reads token from cookie when param is absent', async () => {
      const token = 'Ab3Df5Gh7j9L'; // 12 chars
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      // Set up a dom with the cookie pre-set (no query param)
      const dom = createDom('https://example.com/page');
      const win = dom.window;
      win.document.cookie = `elbPreview=${token}; path=/`;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};
      // Mock HEAD probe as 200 so self-heal proceeds with injection
      (win as unknown as Record<string, unknown>).fetch = () =>
        Promise.resolve({ ok: true, status: 200 });

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      await new Promise((r) => setTimeout(r, 50));

      expect(startFlowCalled).toBe(false);
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(1);
      expect((injected[0] as HTMLScriptElement).src).toContain(
        `walker.${token}.js`,
      );

      win.close();
    });

    it('clears cookie and runs startFlow when param is "off"', async () => {
      const token = 'k9x2m4p7abcd';
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      const dom = createDom('https://example.com/page?elbPreview=off');
      const win = dom.window;
      // Pre-set the cookie
      win.document.cookie = `elbPreview=${token}; path=/`;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      await new Promise((r) => setTimeout(r, 50));

      // Cookie should have been cleared, so startFlow runs
      expect(startFlowCalled).toBe(true);

      // No preview script injected
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(0);

      win.close();
    });
  });

  describe('12-char token (preview service format)', () => {
    it('activates preview with a 12-char lowercase alphanumeric token', async () => {
      const token = 'k9x2m4p7abcd'; // 12 chars, matches preview service output
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      const dom = createDom(`https://example.com/page?elbPreview=${token}`);
      const win = dom.window;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};
      // Mock HEAD probe as 200 so self-heal proceeds with injection
      (win as unknown as Record<string, unknown>).fetch = () =>
        Promise.resolve({ ok: true, status: 200 });

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      await new Promise((r) => setTimeout(r, 50));

      // startFlow must NOT have been called
      expect(startFlowCalled).toBe(false);

      // A preview script should have been injected into <head>
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(1);
      expect((injected[0] as HTMLScriptElement).src).toBe(
        `https://cdn.walkeros.io/preview/proj_abc/walker.${token}.js`,
      );

      // The token should also be stored in a cookie
      expect(win.document.cookie).toContain(`elbPreview=${token}`);

      win.close();
    });
  });

  describe('self-heal (preview script swap outcome)', () => {
    it('clears cookie and falls through to startFlow when the preview script errors (missing bundle)', async () => {
      const token = 'k9x2m4p7abcd';
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      // Pre-set the cookie so the cookie-valid branch is taken (no query param)
      const dom = createDom('https://example.com/page', false);
      const win = dom.window;
      win.document.cookie = `elbPreview=${token}; path=/`;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};

      // The swap must not depend on fetch at all (script loads are
      // CORS-exempt; fetch is not). Record any calls to prove none happen.
      const fetchCalls: unknown[] = [];
      (win as unknown as Record<string, unknown>).fetch = (
        ...args: unknown[]
      ) => {
        fetchCalls.push(args);
        return Promise.resolve({ ok: true, status: 200 });
      };

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      // The preflight injects the pending preview <script> synchronously.
      // Simulate the CDN answering 404/5xx: a script element surfaces every
      // load failure (missing bundle, HTTP error, network) as an error event.
      const pendingScript =
        win.document.querySelector<HTMLScriptElement>('head > script[src]');
      if (!pendingScript) throw new Error('preview script was not injected');
      expect(pendingScript.src).toBe(
        `https://cdn.walkeros.io/preview/proj_abc/walker.${token}.js`,
      );
      pendingScript.dispatchEvent(new win.Event('error'));

      // Wait for the swap promise + IIFE chain to settle
      await new Promise((r) => setTimeout(r, 50));

      // No fetch probe — the swap is gated on the script element itself
      expect(fetchCalls.length).toBe(0);

      // The failed script was removed from <head>
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(0);

      // Cookie cleared (max-age=0 effectively removes it)
      expect(win.document.cookie).not.toContain(`elbPreview=${token}`);

      // Production path runs (fall-through to startFlow)
      expect(startFlowCalled).toBe(true);

      win.close();
    });

    it('clears cookie and falls through to startFlow when the preview script fails to load (network error)', async () => {
      const token = 'Ab3Df5Gh7j9L';
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      const dom = createDom('https://example.com/page', false);
      const win = dom.window;
      win.document.cookie = `elbPreview=${token}; path=/`;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      // A network-level failure fires the same error event on the script
      // element as an HTTP error would — the swap contract treats both alike.
      const pendingScript =
        win.document.querySelector<HTMLScriptElement>('head > script[src]');
      if (!pendingScript) throw new Error('preview script was not injected');
      pendingScript.dispatchEvent(new win.Event('error'));

      await new Promise((r) => setTimeout(r, 50));

      // The failed script was removed from <head>
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(0);

      // Cookie cleared
      expect(win.document.cookie).not.toContain(`elbPreview=${token}`);

      // Production path runs (fall-through to startFlow)
      expect(startFlowCalled).toBe(true);

      win.close();
    });

    it('keeps the preview script and skips startFlow when it loads', async () => {
      const token = 'k9x2m4p7abcd';
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      const dom = createDom('https://example.com/page', false);
      const win = dom.window;
      win.document.cookie = `elbPreview=${token}; path=/`;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      // Simulate the preview bundle loading successfully.
      const pendingScript =
        win.document.querySelector<HTMLScriptElement>('head > script[src]');
      if (!pendingScript) throw new Error('preview script was not injected');
      pendingScript.dispatchEvent(new win.Event('load'));

      await new Promise((r) => setTimeout(r, 50));

      // Preview script stays in <head>
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(1);
      expect((injected[0] as HTMLScriptElement).src).toBe(
        `https://cdn.walkeros.io/preview/proj_abc/walker.${token}.js`,
      );

      // Cookie preserved
      expect(win.document.cookie).toContain(`elbPreview=${token}`);

      // startFlow NOT called (preview took over)
      expect(startFlowCalled).toBe(false);

      win.close();
    });

    it('self-heals when the preview script neither loads nor errors (hung CDN) via the swap timeout', async () => {
      const token = 'k9x2m4p7abcd';
      const entry = generateWrapEntry('./skeleton.mjs', {
        previewOrigin: 'cdn.walkeros.io',
        previewScope: 'proj_abc',
      });

      // No resource loading and no dispatched events: the pending script
      // never settles, so only the preflight's own 5s timer can resolve the
      // swap — exactly the hung-CDN profile.
      const dom = createDom(
        `https://example.com/page?elbPreview=${token}`,
        false,
      );
      const win = dom.window;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      // The pending preview script is injected while the timer runs.
      const pendingScript =
        win.document.querySelector<HTMLScriptElement>('head > script[src]');
      if (!pendingScript) throw new Error('preview script was not injected');

      // Wait past the preflight's 5s swap timeout.
      await new Promise((r) => setTimeout(r, 5400));

      // The pending script was removed so a late load cannot boot a second
      // walker next to the production one.
      const scripts = win.document.querySelectorAll('head > script[src]');
      expect(scripts.length).toBe(0);

      // Cookie cleared by self-heal
      expect(win.document.cookie).not.toContain(`elbPreview=${token}`);

      // Production walker ran
      expect(startFlowCalled).toBe(true);

      win.close();
    }, 10000);
  });

  describe('regression: no preflight without preview options', () => {
    it('does NOT inject any preflight code when no preview options', async () => {
      const entry = generateWrapEntry('./skeleton.mjs', {
        windowCollector: 'collector',
        windowElb: 'elb',
      });

      const dom = createDom(
        'https://example.com/page?elbPreview=sometoken12345678901',
      );
      const win = dom.window;

      let startFlowCalled = false;
      (win as unknown as Record<string, unknown>).__mockStartFlow = () => {
        startFlowCalled = true;
        return Promise.resolve({ collector: {}, elb: () => {} });
      };
      (win as unknown as Record<string, unknown>).__mockWireConfig = (
        d: unknown,
      ) => d;
      (win as unknown as Record<string, unknown>).__mockConfigData = {};

      const script = win.document.createElement('script');
      script.textContent = extractEvaluableScript(entry);
      win.document.body.appendChild(script);

      await new Promise((r) => setTimeout(r, 50));

      // Without preview options, startFlow always runs regardless of query params
      expect(startFlowCalled).toBe(true);
      const injected = win.document.querySelectorAll('head > script[src]');
      expect(injected.length).toBe(0);

      win.close();
    });
  });
});
