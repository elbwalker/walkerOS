import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import { loadJsonConfig, createLogger, getTempDir, isObject } from '../core';
import { parseBundleConfig } from '../bundle/config';
import type { BuildOptions } from '../bundle/config';
import { bundleCore } from '../bundle/bundler';
import { downloadPackages } from '../bundle/package-manager';
import { CallTracker } from './tracker';
import type { SimulateCommandOptions, SimulationResult } from './types';

/**
 * Generate a unique ID for temp files
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Main simulation orchestrator
 */
export async function simulateCore(
  configPath: string,
  event: unknown,
  options: Pick<SimulateCommandOptions, 'json' | 'verbose'> = {},
): Promise<SimulationResult> {
  const logger = createLogger({
    verbose: options.verbose || false,
    silent: false,
    json: options.json || false,
  });

  try {
    logger.info('🎯 Starting walkerOS simulation...');

    // Load and validate configuration
    logger.info('📦 Loading bundle configuration...');
    const fullConfigPath = path.resolve(configPath);
    const rawConfig = await loadJsonConfig(fullConfigPath);
    parseBundleConfig(rawConfig); // Validate config format

    // Execute simulation
    logger.info(`🚀 Executing simulation with event: ${JSON.stringify(event)}`);
    const result = await executeSimulation(event, fullConfigPath);

    // Report results
    if (result.success) {
      logger.info(`✅ Simulation completed successfully`);
    } else {
      logger.error(`❌ Simulation failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`💥 Simulation error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Parse event input - handles both strings and JSON objects
 */
export function parseEventInput(eventString: string = ''): unknown {
  if (!eventString) {
    return {};
  }

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(eventString);
    return isObject(parsed) ? parsed : {};
  } catch {
    // If JSON parsing fails, treat as event name string
    return { name: eventString };
  }
}

/**
 * Simple result formatting
 */
export function formatSimulationResult(
  result: SimulationResult,
  options: Pick<SimulateCommandOptions, 'json'> = {},
): string {
  if (options.json) {
    const output = {
      result: result.elbResult,
      usage: result.usage,
      duration: result.duration,
    };
    return JSON.stringify(output, null, 2);
  }

  if (result.success) {
    return '✅ Simulation completed successfully';
  } else {
    return `❌ Simulation failed: ${result.error}`;
  }
}

/**
 * Execute simulation using destination-provided mock environments
 */
export async function executeSimulation(
  event: unknown,
  configPath: string,
): Promise<SimulationResult> {
  const startTime = Date.now();
  let bundlePath: string | undefined;
  const tempDir = getTempDir();

  try {
    // Ensure temp directory exists
    await fs.ensureDir(tempDir);

    // 1. Load config
    const rawConfig = await loadJsonConfig(configPath);
    const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

    // 2. Download packages to temp directory
    // This ensures we use clean npm packages, not workspace packages
    const packagesArray = Object.entries(buildOptions.packages).map(
      ([name, packageConfig]) => ({
        name,
        version:
          (typeof packageConfig === 'object' &&
          packageConfig !== null &&
          'version' in packageConfig &&
          typeof packageConfig.version === 'string'
            ? packageConfig.version
            : undefined) || 'latest',
      }),
    );
    const packagePaths = await downloadPackages(
      packagesArray,
      tempDir, // downloadPackages will add 'node_modules' subdirectory itself
      createLogger({ silent: true }),
      buildOptions.cache,
    );

    // 3. Create tracker
    const tracker = new CallTracker();

    // 4. Prepare env setup code to inject into bundle
    // The bundle will import examples, so we can reference them directly in the injected code
    const envSetupCode: string[] = [];

    const destinations = (
      flowConfig as unknown as { destinations?: Record<string, unknown> }
    ).destinations;
    if (destinations) {
      for (const [key, dest] of Object.entries(destinations)) {
        // Generate code to wrap env using examples imported IN THE BUNDLE
        const destName = key.replace(/-/g, '_');
        envSetupCode.push(`
  // Inject tracked env for destination '${key}' using examples from bundle
  if (examples && examples['${key}'] && examples['${key}'].env) {
    const mockEnv = examples['${key}'].env.push;
    const trackPaths = examples['${key}'].env.simulation || [];
    if (mockEnv) {
      const wrappedPaths = trackPaths.map((p) => '${key}:' + p);
      const trackedEnv = __simulationTracker.wrapEnv(mockEnv, wrappedPaths);
      if (config.destinations && config.destinations['${key}']) {
        config.destinations['${key}'].env = trackedEnv;
      }
    }
  }
`);
      }
    }

    // 5. Inject env setup code BEFORE startFlow
    // Note: __simulationTracker will be provided via factory function parameter
    const modifiedCode = `
// Inject tracked envs into destination configs
${envSetupCode.join('\n')}

${buildOptions.code || ''}
`;

    // 7. Create temporary bundle with downloaded packages
    const tempOutput = path.join(
      tempDir,
      `simulation-bundle-${generateId()}.mjs`,
    );

    // Create modified build options for simulation
    const simulationBuildOptions: BuildOptions = {
      ...buildOptions,
      code: modifiedCode,
      output: tempOutput,
      tempDir, // Use same temp dir for bundle
      format: 'esm' as const,
      // Force node platform for simulation since we're running in Node.js
      platform: 'node' as const,
    };

    // 8. Bundle with downloaded packages (they're already in tempDir/node_modules)
    await bundleCore(
      flowConfig,
      simulationBuildOptions,
      createLogger({ silent: true }),
      false,
    );
    bundlePath = tempOutput;

    // 9. Inject minimal globals for Node simulation environment
    // This allows destinations to reference window/document without errors
    const globalWithSim = globalThis as Record<string, unknown>;
    if (!globalWithSim.window) {
      globalWithSim.window = {};
    }
    if (!globalWithSim.document) {
      globalWithSim.document = {};
    }

    // 10. Dynamic import the bundle
    const timestamp = Date.now();
    const moduleUrl = `file://${bundlePath}?t=${timestamp}`;
    const module = await import(moduleUrl);

    // 11. Populate globals with destination-specific mocks from examples
    // This happens AFTER import so we can access the exported examples
    const importedExamples = module.examples;
    const destinations2 = (
      flowConfig as unknown as { destinations?: Record<string, unknown> }
    ).destinations;
    if (importedExamples && destinations2) {
      for (const [key, dest] of Object.entries(destinations2)) {
        const destEnv = importedExamples[key]?.env?.push;
        if (destEnv) {
          if (
            destEnv.window &&
            typeof globalWithSim.window === 'object' &&
            globalWithSim.window !== null
          ) {
            Object.assign(globalWithSim.window, destEnv.window);
          }
          if (
            destEnv.document &&
            typeof globalWithSim.document === 'object' &&
            globalWithSim.document !== null
          ) {
            Object.assign(globalWithSim.document, destEnv.document);
          }
        }
      }
    }

    // 12. Call bundle factory function with tracker
    const flowResult = await module.default({ tracker });
    if (!flowResult || typeof flowResult.elb !== 'function') {
      throw new Error(
        'Bundle did not export valid flow object with elb function',
      );
    }

    const { elb } = flowResult;

    // 13. Execute the event
    const elbResult = await elb(event);

    // 14. Retrieve tracked calls from tracker instance
    const usage = tracker.getCalls();

    const duration = Date.now() - startTime;

    return {
      success: true,
      elbResult,
      usage,
      duration,
      logs: [],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  } finally {
    // Cleanup temp directory and all its contents
    if (tempDir) {
      await fs.remove(tempDir).catch(() => {
        // Ignore cleanup errors - temp dirs will be cleaned eventually
      });
    }

    // Cleanup injected globals
    const globalWithSim = globalThis as Record<string, unknown>;
    delete globalWithSim.window;
    delete globalWithSim.document;
  }
}
