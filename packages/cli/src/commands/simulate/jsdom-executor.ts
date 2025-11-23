/**
 * JSDOM-based executor for simulating IIFE bundles
 *
 * Executes actual production IIFE bundles in a virtual DOM environment
 * with env-based mocking from destination examples.
 */

import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs-extra';
import type { Elb } from '@walkeros/core';
import { getErrorMessage } from '../../core/index.js';
import type { CallTracker, ApiCall } from './tracker.js';

export interface ExecutionResult {
  collector: unknown;
  elb: unknown;
  elbResult: Elb.PushResult | undefined;
  usage: Record<string, ApiCall[]>;
  duration: number;
}

/**
 * Build sandbox from destination-provided examples
 *
 * Merges env mocks from each destination's examples, wrapping
 * specified paths with CallTracker for API call tracking.
 */
function buildSandboxFromExamples(
  examples: Record<
    string,
    { env?: { push?: Record<string, unknown>; simulation?: string[] } }
  >,
  destinations: Record<string, unknown>,
  tracker: CallTracker,
): { window: Record<string, unknown>; document: Record<string, unknown> } {
  // Base browser APIs (not provided by destinations)
  const baseBrowserMocks = {
    Image: class MockImage {
      src = '';
      onload = (() => {}) as unknown;
      onerror = (() => {}) as unknown;
    },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    location: { href: 'http://localhost' },
    navigator: { userAgent: 'Mozilla/5.0 (walkerOS Simulation)' },
  };

  const sandbox = {
    window: { ...baseBrowserMocks } as Record<string, unknown>,
    document: {} as Record<string, unknown>,
  };

  // Add destination-specific env mocks
  for (const [destKey, destConfig] of Object.entries(destinations)) {
    const destExamples = examples[destKey];
    if (!destExamples?.env?.push) continue;

    const mockEnv = destExamples.env.push;
    const trackPaths = destExamples.env.simulation || [];

    // Use existing CallTracker to wrap env
    const trackedEnv = tracker.wrapEnv(
      mockEnv as Record<string, unknown>,
      trackPaths.map((p) => `${destKey}:${p}`),
    );

    // Merge window properties
    if (trackedEnv.window && typeof trackedEnv.window === 'object') {
      Object.assign(sandbox.window, trackedEnv.window);
    }

    // Merge document properties
    if (trackedEnv.document && typeof trackedEnv.document === 'object') {
      Object.assign(sandbox.document, trackedEnv.document);
    }
  }

  return sandbox;
}

/**
 * Wait for async window property assignment
 *
 * IIFE bundles execute asynchronously and assign to window.
 * This helper polls until the property appears or timeout occurs.
 */
function waitForWindowProperty(
  window: Record<string, unknown>,
  prop: string,
  timeout: number = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (window[prop] !== undefined) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(
          new Error(
            `Timeout waiting for window.${prop}. ` +
              `IIFE may have failed to execute or assign to window.`,
          ),
        );
      } else {
        setImmediate(check);
      }
    };

    check();
  });
}

/**
 * Execute production IIFE bundle in JSDOM with env-based mocking
 *
 * Main orchestration function that:
 * 1. Creates JSDOM virtual DOM
 * 2. Loads bundle and extracts examples
 * 3. Builds sandbox from destination examples
 * 4. Executes IIFE in JSDOM
 * 5. Waits for window.collector/elb assignment
 * 6. Runs event through elb
 * 7. Returns tracked API calls
 */
export async function executeInJSDOM(
  bundlePath: string,
  destinations: Record<string, unknown>,
  event: { name: string; data?: unknown },
  tracker: CallTracker,
  timeout: number = 10000,
): Promise<ExecutionResult> {
  const start = Date.now();

  // 1. Create JSDOM virtual DOM with console suppression
  const virtualConsole = new VirtualConsole();
  // Silent mode - don't pipe console output to process stdout/stderr
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously', // Allow script execution
    resources: 'usable',
    virtualConsole,
  });

  const { window } = dom;

  // 2. Load bundle code
  const bundleCode = await fs.readFile(bundlePath, 'utf8');

  // 3. Split bundle into setup (examples) and IIFE parts
  // Look for the IIFE pattern: (async () => {
  const iifeMatch = bundleCode.match(
    /(\(async\s*\(\)\s*=>\s*\{[\s\S]*\}\)\(\);?)/,
  );

  if (!iifeMatch) {
    throw new Error('Could not find IIFE pattern in bundle');
  }

  const iifeStart = iifeMatch.index!;
  const setupPart = bundleCode.substring(0, iifeStart);
  const iifePart = bundleCode.substring(iifeStart);

  // 4. Execute setup part to get examples
  const setupScript = window.document.createElement('script');
  setupScript.textContent = setupPart;

  try {
    window.document.body.appendChild(setupScript);
  } catch (error) {
    throw new Error(
      `Failed to execute bundle setup: ${getErrorMessage(error)}`,
    );
  }

  // 5. Extract examples from window (should be set by setup part)
  const examples =
    (
      window as unknown as {
        __walkerOS_examples?: Record<
          string,
          { env?: { push?: Record<string, unknown>; simulation?: string[] } }
        >;
      }
    ).__walkerOS_examples || {};

  // 6. Build sandbox from examples and inject into window
  const sandbox = buildSandboxFromExamples(examples, destinations, tracker);
  Object.assign(window, sandbox.window);
  Object.assign(window.document, sandbox.document);

  // 7. Execute IIFE part with sandbox in place
  const iifeScript = window.document.createElement('script');
  iifeScript.textContent = iifePart;

  try {
    window.document.body.appendChild(iifeScript);
  } catch (error) {
    throw new Error(`Failed to execute IIFE: ${getErrorMessage(error)}`);
  }

  // 8. Wait for window.collector and window.elb assignments
  try {
    await waitForWindowProperty(
      window as unknown as Record<string, unknown>,
      'collector',
      timeout,
    );
    await waitForWindowProperty(
      window as unknown as Record<string, unknown>,
      'elb',
      timeout,
    );
  } catch (error) {
    throw new Error(
      `Window property assignment failed: ${getErrorMessage(error)}`,
    );
  }

  const { collector, elb } = window as unknown as {
    collector: unknown;
    elb: (name: string, data?: unknown) => Promise<unknown>;
  };

  // 9. Run event through elb
  let elbResult: Elb.PushResult | undefined;
  try {
    elbResult = (await elb(event.name, event.data)) as
      | Elb.PushResult
      | undefined;
  } catch (error) {
    throw new Error(`Event execution failed: ${getErrorMessage(error)}`);
  }

  // 10. Return results with tracked calls
  return {
    collector,
    elb,
    elbResult,
    usage: tracker.getCalls(),
    duration: Date.now() - start,
  };
}
