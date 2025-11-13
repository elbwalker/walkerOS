import path from 'path';
import fs from 'fs-extra';
import { loadJsonConfig, createLogger, getTempDir, isObject } from '../core';
import { parseBundleConfig, type BundleConfig } from '../bundle/config';
import { bundle } from '../bundle/bundler';
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
export async function simulate(
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
 * Infer package name from destination key
 */
function inferPackageName(destKey: string, platform: 'web' | 'server'): string {
  // Common destination mappings
  const webDestinations: Record<string, string> = {
    gtag: '@walkeros/web-destination-gtag',
    api: '@walkeros/web-destination-api',
    meta: '@walkeros/web-destination-meta',
    plausible: '@walkeros/web-destination-plausible',
    piwikpro: '@walkeros/web-destination-piwikpro',
  };

  const serverDestinations: Record<string, string> = {
    aws: '@walkeros/server-destination-aws',
    gcp: '@walkeros/server-destination-gcp',
    meta: '@walkeros/server-destination-meta',
  };

  const mapping = platform === 'web' ? webDestinations : serverDestinations;
  const prefix =
    platform === 'web'
      ? '@walkeros/web-destination-'
      : '@walkeros/server-destination-';

  return mapping[destKey] || `${prefix}${destKey}`;
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
  let trackerId: string | undefined;

  try {
    // 1. Load config
    const rawConfig = await loadJsonConfig(configPath);
    const config = parseBundleConfig(rawConfig) as BundleConfig & {
      platform: 'web' | 'server';
    };

    // 2. Create tracker
    const tracker = new CallTracker();

    // 3. Load mock envs and prepare injection code
    const envSetupCode: string[] = [];

    if (config.destinations) {
      for (const [key, dest] of Object.entries(config.destinations)) {
        // Determine package name
        const packageName =
          (dest as any).package || inferPackageName(key, config.platform);

        try {
          // Dynamic import of destination package
          const destModule = await import(packageName);

          // Get mock env and tracking paths
          const mockEnv = destModule.examples?.env?.push;
          const trackPaths = destModule.examples?.env?.simulation || [];

          if (mockEnv) {
            // Wrap mock env to track calls
            const wrappedPaths = trackPaths.map((p: string) => `${key}:${p}`);
            const trackedEnv = tracker.wrapEnv(mockEnv, wrappedPaths);

            // Store wrapped env globally
            const envKey = `__env_${key}_${generateId()}`;
            (globalThis as any)[envKey] = trackedEnv;

            // Add code to inject env into destination config after startFlow config is created
            envSetupCode.push(`
  // Inject tracked env for destination '${key}'
  if (config.destinations && config.destinations['${key}']) {
    config.destinations['${key}'].env = globalThis['${envKey}'];
  }
`);
          } else {
            console.warn(
              `⚠️  No mock env for destination '${key}', skipping tracking`,
            );
          }
        } catch (error) {
          // Destination doesn't have examples or isn't installed
          console.warn(
            `⚠️  Could not load destination '${key}' (${packageName}), skipping tracking`,
          );
        }
      }
    }

    // 4. Store tracker reference globally
    trackerId = `__tracker_${generateId()}`;
    (globalThis as any)[trackerId] = tracker;

    // 5. Inject tracker and env setup code BEFORE startFlow
    config.code = `
// Simulation tracker setup
const __simulationTracker = globalThis['${trackerId}'];

// Inject tracked envs into destination configs
${envSetupCode.join('\n')}

${config.code || ''}

// Expose tracker for retrieval after execution
globalThis.__simulationTrackerResult = __simulationTracker;
`;

    // 6. Create temporary bundle
    const tempDir = getTempDir();
    const tempOutput = path.join(
      tempDir,
      `simulation-bundle-${generateId()}.mjs`,
    );

    config.output = tempOutput;
    config.build = {
      ...config.build,
      format: 'esm' as const,
    };

    // 7. Bundle with standard bundle() function
    await bundle(config, createLogger({ silent: true }), false);
    bundlePath = tempOutput;

    // 8. Dynamic import the bundle
    const timestamp = Date.now();
    const moduleUrl = `file://${bundlePath}?t=${timestamp}`;
    const module = await import(moduleUrl);

    // 9. Get flow from bundle
    const flowResult = await module.default;
    if (!flowResult || typeof flowResult.elb !== 'function') {
      throw new Error(
        'Bundle did not export valid flow object with elb function',
      );
    }

    const { elb } = flowResult;

    // 10. Execute the event
    const elbResult = await elb(event);

    // 11. Retrieve tracked calls
    const resultTracker = (globalThis as any).__simulationTrackerResult;
    const usage = resultTracker ? resultTracker.getCalls() : {};

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
    // Cleanup temp bundle file
    if (bundlePath) {
      await fs.remove(path.dirname(bundlePath)).catch(() => {});
    }

    // Cleanup global references
    if (trackerId) {
      delete (globalThis as any)[trackerId];
    }
    delete (globalThis as any).__simulationTrackerResult;
  }
}
