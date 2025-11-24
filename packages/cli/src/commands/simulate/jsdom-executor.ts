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

interface DestinationEnv {
  init?: Record<string, unknown>;
  push: Record<string, unknown>;
  simulation?: string[];
}

/**
 * Build sandbox from destination-provided envs
 *
 * Merges env mocks from each destination's envs, wrapping
 * specified paths with CallTracker for API call tracking.
 */
function buildSandboxFromEnvs(
  envs: Record<string, DestinationEnv>,
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
    const destEnv = envs[destKey];
    if (!destEnv?.push) continue;

    const mockEnv = destEnv.push;
    const trackPaths = destEnv.simulation || [];

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
 * 2. Builds sandbox from dynamically loaded envs
 * 3. Executes IIFE in JSDOM
 * 4. Waits for window.collector/elb assignment
 * 5. Runs event through elb
 * 6. Returns tracked API calls
 */
export async function executeInJSDOM(
  bundlePath: string,
  destinations: Record<string, unknown>,
  event: { name: string; data?: unknown },
  tracker: CallTracker,
  envs: Record<string, DestinationEnv>,
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

  // 2. Build sandbox from dynamically loaded envs and inject into window
  const sandbox = buildSandboxFromEnvs(envs, destinations, tracker);
  Object.assign(window, sandbox.window);
  Object.assign(window.document, sandbox.document);

  // 3. Load and execute bundle code
  const bundleCode = await fs.readFile(bundlePath, 'utf8');

  try {
    window.eval(bundleCode);
  } catch (error) {
    throw new Error(`Bundle execution failed: ${getErrorMessage(error)}`);
  }

  // 4. Wait for window.collector and window.elb assignments
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

  // 5. Run event through elb
  let elbResult: Elb.PushResult | undefined;
  try {
    elbResult = (await elb(event.name, event.data)) as
      | Elb.PushResult
      | undefined;
  } catch (error) {
    throw new Error(`Event execution failed: ${getErrorMessage(error)}`);
  }

  // 6. Return results with tracked calls
  return {
    collector,
    elb,
    elbResult,
    usage: tracker.getCalls(),
    duration: Date.now() - start,
  };
}
