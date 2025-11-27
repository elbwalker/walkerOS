/**
 * Node.js-based executor for simulating ESM server bundles
 *
 * Executes server bundles via dynamic import with env-based mocking.
 */

import { pathToFileURL } from 'url';
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
 * Build global mocks from destination-provided envs
 */
function buildGlobalMocksFromEnvs(
  envs: Record<string, DestinationEnv>,
  destinations: Record<string, unknown>,
  tracker: CallTracker,
): Record<string, unknown> {
  const globalMocks: Record<string, unknown> = {};

  for (const [destKey] of Object.entries(destinations)) {
    const destEnv = envs[destKey];
    if (!destEnv?.push) continue;

    const mockEnv = destEnv.push;
    const trackPaths = destEnv.simulation || [];

    const trackedEnv = tracker.wrapEnv(
      mockEnv as Record<string, unknown>,
      trackPaths.map((p) => `${destKey}:${p}`),
    );

    Object.assign(globalMocks, trackedEnv);
  }

  return globalMocks;
}

/**
 * Inject mocks into global scope and return cleanup function
 */
function injectGlobalMocks(mocks: Record<string, unknown>): () => void {
  const originalValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(mocks)) {
    originalValues[key] = (globalThis as Record<string, unknown>)[key];
    (globalThis as Record<string, unknown>)[key] = value;
  }

  return () => {
    for (const [key, value] of Object.entries(originalValues)) {
      if (value === undefined) {
        delete (globalThis as Record<string, unknown>)[key];
      } else {
        (globalThis as Record<string, unknown>)[key] = value;
      }
    }
  };
}

/**
 * Execute server ESM bundle in Node.js with env-based mocking
 */
export async function executeInNode(
  bundlePath: string,
  destinations: Record<string, unknown>,
  event: { name: string; data?: unknown },
  tracker: CallTracker,
  envs: Record<string, DestinationEnv>,
  timeout: number = 30000,
): Promise<ExecutionResult> {
  const start = Date.now();

  const globalMocks = buildGlobalMocksFromEnvs(envs, destinations, tracker);
  const cleanupMocks = injectGlobalMocks(globalMocks);

  try {
    const executeWithTimeout = async (): Promise<ExecutionResult> => {
      // Jest has issues with file:// URLs in dynamic imports, use path directly
      // Outside Jest, use file:// URL with cache-busting to prevent module caching
      const importUrl = process.env.JEST_WORKER_ID
        ? bundlePath
        : `${pathToFileURL(bundlePath).href}?t=${Date.now()}`;

      const module = await import(importUrl);

      if (!module.default || typeof module.default !== 'function') {
        throw new Error('Bundle does not export default factory function');
      }

      const result = await module.default();

      if (!result || !result.elb || typeof result.elb !== 'function') {
        throw new Error(
          'Factory function did not return valid result with elb',
        );
      }

      const { collector, elb } = result;

      let elbResult: Elb.PushResult | undefined;
      try {
        elbResult = (await elb(event.name, event.data)) as
          | Elb.PushResult
          | undefined;
      } catch (error) {
        throw new Error(`Event execution failed: ${getErrorMessage(error)}`);
      }

      return {
        collector,
        elb,
        elbResult,
        usage: tracker.getCalls(),
        duration: Date.now() - start,
      };
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Server simulation timeout after ${timeout}ms`)),
        timeout,
      );
    });

    return await Promise.race([executeWithTimeout(), timeoutPromise]);
  } catch (error) {
    throw new Error(`Node execution failed: ${getErrorMessage(error)}`);
  } finally {
    cleanupMocks();
  }
}
