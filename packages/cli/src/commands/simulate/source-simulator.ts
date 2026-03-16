import { JSDOM, VirtualConsole } from 'jsdom';
import { simulate } from '@walkeros/collector';
import type { Source, Trigger } from '@walkeros/core';
import type { SimulationResult } from './types.js';
import { getErrorMessage } from '../../core/index.js';

interface SourceSimulationOptions {
  flow?: string;
  sourceStep: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
  triggerType?: string;
  triggerOptions?: unknown;
}

/**
 * Load source code and optional createTrigger from an npm package.
 */
async function loadSourcePackage(packageName: string): Promise<{
  code: Source.Init;
  createTrigger?: Trigger.CreateFn;
  legacyTrigger?: (
    input: unknown,
    env: Record<string, unknown>,
  ) => void | (() => void);
}> {
  const mainModule = await import(packageName);
  const code = mainModule.default || Object.values(mainModule)[0];
  if (!code || typeof code !== 'function') {
    throw new Error(`Package ${packageName} missing source init function`);
  }

  let createTrigger: Trigger.CreateFn | undefined;
  let legacyTrigger:
    | ((input: unknown, env: Record<string, unknown>) => void | (() => void))
    | undefined;

  try {
    const devModule = await import(`${packageName}/dev`);
    const examples = devModule.examples || devModule.default?.examples;
    if (
      examples?.createTrigger &&
      typeof examples.createTrigger === 'function'
    ) {
      createTrigger = examples.createTrigger;
    } else if (examples?.trigger && typeof examples.trigger === 'function') {
      legacyTrigger = examples.trigger;
    }
  } catch {
    // No dev exports — skip
  }

  return { code, createTrigger, legacyTrigger };
}

/**
 * Simulate a source using JSDOM + unified simulate().
 */
export async function simulateSourceCLI(
  flowConfig: Record<string, unknown>,
  setupInput: unknown,
  options: SourceSimulationOptions,
): Promise<SimulationResult> {
  const startTime = Date.now();

  try {
    const sources = (
      flowConfig as {
        sources?: Record<
          string,
          { package?: string; config?: Record<string, unknown> }
        >;
      }
    ).sources;
    if (!sources) {
      throw new Error('Flow config has no sources');
    }

    const sourceConfig = sources[options.sourceStep];
    if (!sourceConfig) {
      const available = Object.keys(sources).join(', ');
      throw new Error(
        `Source "${options.sourceStep}" not found. Available: ${available}`,
      );
    }
    if (!sourceConfig.package) {
      throw new Error(`Source "${options.sourceStep}" has no package field`);
    }

    // Load source code + createTrigger/legacyTrigger
    const { code, createTrigger, legacyTrigger } = await loadSourcePackage(
      sourceConfig.package,
    );

    if (createTrigger) {
      // New path: use createTrigger — package manages its own lifecycle
      const result = await simulate({
        step: 'source',
        name: options.sourceStep,
        code,
        config: sourceConfig.config || {},
        createTrigger,
        triggerType: options.triggerType,
        triggerOptions: options.triggerOptions,
        content: setupInput,
      });

      return {
        success: !result.error,
        error: result.error?.message,
        capturedEvents: result.events,
        duration: Date.now() - startTime,
      };
    }

    // Legacy path: create JSDOM and use old trigger pattern
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body></body></html>',
      {
        url: 'http://localhost',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        virtualConsole,
      },
    );

    const env: Record<string, unknown> = {
      window: dom.window as unknown as Window & typeof globalThis,
      document: dom.window.document as unknown as Document,
      localStorage: dom.window.localStorage as unknown as Storage,
    };

    // Use unified simulate()
    const result = await simulate({
      step: 'source',
      name: options.sourceStep,
      code,
      config: sourceConfig.config || {},
      trigger: legacyTrigger,
      input: setupInput,
      env,
    });

    // Cleanup
    dom.window.close();

    return {
      success: !result.error,
      error: result.error?.message,
      capturedEvents: result.events,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      duration: Date.now() - startTime,
    };
  }
}
