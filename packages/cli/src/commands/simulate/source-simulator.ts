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
}

/**
 * Load source code and createTrigger from an npm package.
 */
async function loadSourcePackage(packageName: string): Promise<{
  code: Source.Init;
  createTrigger?: Trigger.CreateFn;
}> {
  const mainModule = await import(packageName);
  const code = mainModule.default || Object.values(mainModule)[0];
  if (!code || typeof code !== 'function') {
    throw new Error(`Package ${packageName} missing source init function`);
  }

  let createTrigger: Trigger.CreateFn | undefined;

  try {
    const devModule = await import(`${packageName}/dev`);
    const examples = devModule.examples || devModule.default?.examples;
    if (
      examples?.createTrigger &&
      typeof examples.createTrigger === 'function'
    ) {
      createTrigger = examples.createTrigger;
    }
  } catch {
    // No dev exports — skip
  }

  return { code, createTrigger };
}

/**
 * Simulate a source using the createTrigger pattern.
 *
 * @param flowConfig - Flow settings for the target flow
 * @param sourceInput - SourceInput { content, trigger?, env? } — passed through to collector
 * @param options - Simulation options
 */
export async function simulateSourceCLI(
  flowConfig: Record<string, unknown>,
  sourceInput: unknown,
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

    const { code, createTrigger } = await loadSourcePackage(
      sourceConfig.package,
    );

    if (!createTrigger) {
      throw new Error(
        `Source package ${sourceConfig.package} has no createTrigger export. ` +
          `Ensure the package exports createTrigger from its /dev subpath.`,
      );
    }

    // Pass sourceInput directly as input — the collector types it as SourceInput.
    // No detection logic. When --step source.* is used, the event IS the SourceInput.
    const result = await simulate({
      step: 'source',
      name: options.sourceStep,
      code,
      config: sourceConfig.config || {},
      createTrigger,
      input: (sourceInput || { content: undefined }) as {
        content: unknown;
        trigger?: { type?: string; options?: unknown };
        env?: Record<string, unknown>;
      },
    });

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
