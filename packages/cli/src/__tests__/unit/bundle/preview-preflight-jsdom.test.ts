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

function createDom(url = 'https://example.com'): JSDOM {
  const virtualConsole = new VirtualConsole();
  // Suppress jsdom errors about script loading (the preview script URL is fake)
  virtualConsole.on('jsdomError', () => {});
  return new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url,
    runScripts: 'dangerously',
    resources: 'usable',
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
