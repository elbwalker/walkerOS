import { JSDOM, VirtualConsole } from 'jsdom';
import { simulate } from '@walkeros/collector';
import type { Source } from '@walkeros/core';
import type { SimulationResult } from './types.js';
import { getErrorMessage } from '../../core/index.js';

interface SourceSimulationOptions {
  flow?: string;
  sourceStep: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

/**
 * Load source code and optional setup from an npm package.
 */
async function loadSourcePackage(
  packageName: string,
): Promise<{ code: Source.Init; setup?: Source.SetupFn }> {
  const mainModule = await import(packageName);
  const code = mainModule.default || Object.values(mainModule)[0];
  if (!code || typeof code !== 'function') {
    throw new Error(`Package ${packageName} missing source init function`);
  }

  let setup: Source.SetupFn | undefined;
  try {
    const devModule = await import(`${packageName}/dev`);
    const examples = devModule.examples || devModule.default?.examples;
    if (examples?.setup && typeof examples.setup === 'function') {
      setup = examples.setup;
    }
  } catch {
    // No dev exports — skip
  }

  return { code, setup };
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

    // Load source code + setup
    const { code, setup } = await loadSourcePackage(sourceConfig.package);

    // Create JSDOM
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

    const env: Source.SimulationEnv = {
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
      setup,
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
