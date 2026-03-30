import path from 'path';
import { pathToFileURL } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';
import type { Logger } from '@walkeros/core';
import type { PushResult } from './types.js';
import { getErrorMessage } from '../../core/utils.js';

export interface FlowContextOptions {
  esmPath: string;
  platform: 'web' | 'server';
  logger: Logger.Instance;
  snapshotCode?: string;
  timeout?: number;
}

/**
 * Loosely typed module shape from a dynamically imported ESM bundle.
 * The bundle has no compile-time types, so we use permissive signatures
 * and let the callbacks do runtime validation (e.g., "collector missing push").
 */
export interface FlowModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wireConfig: (data?: unknown) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startFlow: (config: unknown) => Promise<any>;
  __configData?: unknown;
}

/**
 * Set up execution environment (JSDOM for web, snapshot eval),
 * import the ESM bundle, validate wireConfig/startFlow, then
 * call the provided function with the loaded module.
 *
 * Handles: JSDOM global injection, Node 22 navigator compat,
 * snapshot eval, ESM import with cache bust, error wrapping,
 * global cleanup in finally.
 */
export async function withFlowContext(
  options: FlowContextOptions,
  fn: (module: FlowModule) => Promise<PushResult>,
): Promise<PushResult> {
  const { esmPath, platform, logger, snapshotCode, timeout } = options;
  const startTime = Date.now();
  const g = global as unknown as Record<string, unknown>;
  let savedWindow: unknown, savedDocument: unknown, savedNavigator: unknown;
  let dom: JSDOM | undefined;

  // JSDOM setup for web platform
  if (platform === 'web') {
    const virtualConsole = new VirtualConsole();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
    });
    savedWindow = g.window;
    savedDocument = g.document;
    savedNavigator = g.navigator;
    g.window = dom.window;
    g.document = dom.window.document;
    Object.defineProperty(global, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  }

  try {
    // Eval snapshot before importing bundle
    if (snapshotCode) {
      if (platform === 'web' && dom) {
        logger.debug('Evaluating snapshot in JSDOM');
        dom.window.eval(snapshotCode);
      } else {
        logger.debug('Evaluating snapshot in Node');
        const vm = await import('vm');
        vm.runInThisContext(snapshotCode);
      }
    }

    // Import ESM bundle with cache bust
    const fileUrl = pathToFileURL(path.resolve(esmPath)).href;
    const module = await import(`${fileUrl}?t=${Date.now()}`);
    const { wireConfig, startFlow } = module;

    if (typeof wireConfig !== 'function' || typeof startFlow !== 'function') {
      throw new Error(
        'Invalid ESM bundle: missing wireConfig or startFlow exports',
      );
    }

    const flowModule: FlowModule = {
      wireConfig,
      startFlow,
      __configData: module.__configData,
    };

    // Execute step-specific logic with optional timeout
    if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Push timeout after ${timeout}ms`)),
          timeout,
        );
      });
      return await Promise.race([fn(flowModule), timeoutPromise]);
    }

    return await fn(flowModule);
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    if (platform === 'web') {
      if (savedWindow !== undefined) g.window = savedWindow;
      else delete g.window;
      if (savedDocument !== undefined) g.document = savedDocument;
      else delete g.document;
      if (savedNavigator !== undefined) {
        Object.defineProperty(global, 'navigator', {
          value: savedNavigator,
          configurable: true,
          writable: true,
        });
      } else {
        delete g.navigator;
      }
    }
  }
}
