import path from 'path';
import fs from 'fs-extra';
import {
  createIngest,
  getPlatform,
  compileNext,
  resolveNext,
  isRouteArray,
  buildCacheContext,
} from '@walkeros/core';
import {
  destinationInit,
  destinationPush,
  transformerInit,
  transformerPush,
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
} from '@walkeros/collector';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  getErrorMessage,
  detectInput,
  isStdinPiped,
  readStdinToTempFile,
  writeResult,
  type Platform,
} from '../../core/index.js';
import { validateEvent } from '../../core/event-validation.js';
import type { Logger, Simulation, WalkerOS } from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import { loadFlowConfig, loadJsonFromSource } from '../../config/index.js';
import { loadConfig } from '../../config/utils.js';
import { bundleCore } from '../bundle/bundler.js';
import type { NetworkCall, PushCommandOptions, PushResult } from './types.js';
import type { PushOptions } from '../../schemas/push.js';
import { buildOverrides, type PushOverrides } from './overrides.js';
import { applyOverrides } from './apply-overrides.js';
import { resolvePackageImportPath } from '../../core/package-path.js';
import { withFlowContext } from './flow-context.js';

/**
 * Build usage map from tracking calls (populated by wrapEnv during execution).
 * Returns only destinations that had actual API calls.
 */
function buildUsage(
  trackingCalls: Array<{ destId: string; calls: Simulation.Call[] }>,
): Record<string, Simulation.Call[]> {
  const usage: Record<string, Simulation.Call[]> = {};
  for (const { destId, calls } of trackingCalls) {
    if (calls.length > 0) usage[destId] = calls;
  }
  return usage;
}

/**
 * Resolve a before chain config to an ordered array of transformer IDs.
 * Handles both static (string/string[]) and conditional (Route[]) chains,
 * matching the pattern used by source.ts in the collector.
 */
function resolveBeforeChain(
  before: unknown,
  transformers: import('@walkeros/core').Transformer.Transformers,
  ingest?: import('@walkeros/core').Ingest,
  event?: WalkerOS.DeepPartialEvent,
): string[] {
  if (!before) return [];

  const next = before as import('@walkeros/core').Transformer.Next;

  if (isRouteArray(next)) {
    const compiled = compileNext(next);
    const resolved = resolveNext(compiled!, buildCacheContext(ingest, event));
    if (!resolved) return [];
    return walkChain(resolved, extractTransformerNextMap(transformers));
  }

  return walkChain(
    next as string | string[],
    extractTransformerNextMap(transformers),
  );
}

/**
 * Core push logic without CLI concerns (no process.exit, no output formatting)
 */
async function pushCore(
  inputPath: string,
  event: unknown,
  options: {
    flow?: string;
    json?: boolean;
    verbose?: boolean;
    silent?: boolean;
    platform?: string;
    simulate?: string[];
    mock?: string[];
    snapshot?: string;
  } = {},
): Promise<PushResult> {
  const logger = createCLILogger({
    silent: options.silent,
    verbose: options.verbose,
  });
  const startTime = Date.now();
  let tempDir: string | undefined;

  try {
    // Validate event format (skip for source simulation — different event shape)
    const isSourceSimulate = options.simulate?.some((s) =>
      s.startsWith('source.'),
    );
    if (!isSourceSimulate) {
      const validation = validateEvent(event, 'standard');
      if (!validation.valid) {
        const errors = validation.errors
          .map((e) => `${e.path}: ${e.message}`)
          .join(', ');
        throw new Error(`Invalid event: ${errors}`);
      }
      for (const w of validation.warnings) {
        logger.info(`Warning: ${w.message}`);
      }
    }

    const eventObj = event as { name?: string; data?: Record<string, unknown> };
    const validatedEvent: { name: string; data: Record<string, unknown> } = {
      name: eventObj.name!,
      data: (eventObj.data || {}) as Record<string, unknown>,
    };

    // Detect input type
    logger.debug('Detecting input type');
    const detected = await detectInput(
      inputPath,
      options.platform as Platform | undefined,
    );

    let result: PushResult;

    // Load snapshot code if provided
    let snapshotCode: string | undefined;
    if (options.snapshot) {
      snapshotCode = (await loadConfig(options.snapshot, {
        json: false,
      })) as string;
      logger.debug(`Snapshot loaded (${snapshotCode.length} bytes)`);
    }

    if (detected.type === 'config') {
      result = await executeConfigPush(
        {
          config: inputPath,
          flow: options.flow,
          verbose: options.verbose,
          simulate: options.simulate,
          mock: options.mock,
        } as PushCommandOptions,
        validatedEvent,
        logger,
        (dir) => {
          tempDir = dir;
        },
        snapshotCode,
      );
    } else {
      result = await executeBundlePush(
        detected.content,
        detected.platform,
        validatedEvent,
        logger,
        (dir) => {
          tempDir = dir;
        },
        undefined,
        snapshotCode,
      );
    }

    return result;
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    if (tempDir) {
      await fs.remove(tempDir).catch(() => {});
    }
  }
}

/**
 * CLI command handler for push command
 */
export async function pushCommand(options: PushCommandOptions): Promise<void> {
  const logger = createCLILogger({ ...options, stderr: true });
  const startTime = Date.now();

  try {
    // Resolve config: stdin > argument > default
    let config: string;
    if (isStdinPiped() && !options.config) {
      config = await readStdinToTempFile('push');
    } else {
      config = options.config || 'bundle.config.json';
    }

    const result = await push(config, options.event, {
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
      platform: options.platform as Platform | undefined,
      simulate: options.simulate,
      mock: options.mock,
      snapshot: options.snapshot,
    });

    const duration = Date.now() - startTime;

    // Format result
    let output: string;
    if (options.json) {
      output = JSON.stringify(
        {
          success: result.success,
          event: result.elbResult,
          duration,
        },
        null,
        2,
      );
    } else {
      const lines: string[] = [];
      if (result.success) {
        lines.push('Event pushed successfully');
        if (result.elbResult && typeof result.elbResult === 'object') {
          const pushResult = result.elbResult as unknown as Record<
            string,
            unknown
          >;
          if ('id' in pushResult && pushResult.id)
            lines.push(`  Event ID: ${pushResult.id}`);
          if ('entity' in pushResult && pushResult.entity)
            lines.push(`  Entity: ${pushResult.entity}`);
          if ('action' in pushResult && pushResult.action)
            lines.push(`  Action: ${pushResult.action}`);
        }
        lines.push(`  Duration: ${duration}ms`);
      } else {
        lines.push(`Error: ${result.error}`);
      }
      output = lines.join('\n');
    }

    // Write to file or stdout
    await writeResult(output + '\n', { output: options.output });

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      const errorOutput = JSON.stringify(
        { success: false, error: errorMessage, duration },
        null,
        2,
      );
      await writeResult(errorOutput + '\n', { output: options.output });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }

    process.exit(1);
  }
}

/**
 * High-level push function for programmatic usage.
 *
 * WARNING: This makes real API calls to real endpoints.
 * Events will be sent to configured destinations (analytics, CRM, etc.).
 *
 * @param configOrPath - Path to flow configuration file or pre-built bundle
 * @param event - Event object to push
 * @param options - Push options
 * @param options.silent - Suppress all output (default: false)
 * @param options.verbose - Enable verbose logging (default: false)
 * @param options.json - Format output as JSON (default: false)
 * @returns Push result with success status, elb result, and duration
 *
 * @example
 * ```typescript
 * const result = await push('./walker.config.json', {
 *   name: 'page view',
 *   data: { title: 'Home Page', path: '/', url: 'https://example.com' }
 * });
 * ```
 */
export async function push(
  configOrPath: string | unknown,
  event: unknown,
  options: PushOptions & {
    flow?: string;
    platform?: Platform;
    simulate?: string[];
    mock?: string[];
    snapshot?: string;
  } = {},
): Promise<PushResult> {
  if (typeof configOrPath !== 'string') {
    throw new Error(
      'push() currently only supports config file paths. ' +
        'Config object support will be added in a future version. ' +
        'Please provide a path to a configuration file.',
    );
  }

  // Resolve string event inputs (file paths, URLs, JSON strings)
  let resolvedEvent = event;
  if (typeof event === 'string') {
    resolvedEvent = await loadJsonFromSource(event, { name: 'event' });
  }

  return await pushCore(configOrPath, resolvedEvent, {
    json: options.json ?? false,
    verbose: options.verbose ?? false,
    silent: options.silent ?? false,
    flow: options.flow,
    platform: options.platform,
    simulate: options.simulate,
    mock: options.mock,
    snapshot: options.snapshot,
  });
}

/**
 * Execute push from config JSON (existing behavior)
 */
async function executeConfigPush(
  options: PushCommandOptions,
  validatedEvent: { name: string; data: Record<string, unknown> },
  logger: Logger.Instance,
  setTempDir: (dir: string) => void,
  snapshotCode?: string,
): Promise<PushResult> {
  // Load config
  logger.debug('Loading flow configuration');
  const { flowSettings, buildOptions } = await loadFlowConfig(options.config!, {
    flowName: options.flow,
    logger,
  });

  const platform = getPlatform(flowSettings);

  // Build overrides from --simulate/--mock flags
  const overrides = buildOverrides(
    { simulate: options.simulate, mock: options.mock },
    flowSettings,
  );

  // Auto-load destination /dev envs for simulated/mocked destinations
  if (overrides.destinations) {
    const { loadDestinationEnvs } = await import('./env-loader.js');
    const configDir = buildOptions.configDir || process.cwd();
    const envs = await loadDestinationEnvs(
      flowSettings.destinations ?? {},
      flowSettings.packages,
      configDir,
    );
    for (const [destId, env] of Object.entries(envs)) {
      if (overrides.destinations[destId] && env.push) {
        overrides.destinations[destId].env = env.push;
        if (env.simulation && env.simulation.length > 0) {
          overrides.destinations[destId].simulation = env.simulation;
        }
      }
    }
  }

  // Bundle to temp file
  logger.debug('Bundling flow configuration');
  const tempDir = getTmpPath(
    undefined,
    `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  setTempDir(tempDir);
  await fs.ensureDir(tempDir);
  const tempPath = path.join(tempDir, 'bundle.mjs');

  const pushBuildOptions = {
    ...buildOptions,
    output: tempPath,
    format: 'esm' as const,
    platform: platform === 'web' ? ('browser' as const) : ('node' as const),
    skipWrapper: true, // CLI imports ESM directly — no platform wrapper
  };

  await bundleCore(flowSettings, pushBuildOptions, logger, false);

  logger.debug(`Bundle created: ${tempPath}`);

  // Check for source simulation
  const sourceSimulateEntry = overrides.sources
    ? Object.entries(overrides.sources).find(([, s]) => s.simulate)
    : undefined;

  if (sourceSimulateEntry) {
    const [sourceId] = sourceSimulateEntry;
    const sourceConfig = (flowSettings.sources ?? {})[sourceId] as
      | { package?: string }
      | undefined;

    if (!sourceConfig?.package) {
      throw new Error(`Source "${sourceId}" has no package defined`);
    }

    // Load createTrigger from source package's /dev export
    const configDir = buildOptions.configDir || process.cwd();
    const devPath = resolvePackageImportPath(
      sourceConfig.package,
      flowSettings.packages,
      configDir,
      '/dev',
    );
    const devModule = await import(devPath);
    const createTrigger =
      devModule.examples?.createTrigger ||
      devModule.default?.examples?.createTrigger;

    if (!createTrigger) {
      throw new Error(
        `Source package "${sourceConfig.package}" has no createTrigger in /dev export`,
      );
    }

    return executeSourceSimulation(
      tempPath,
      validatedEvent,
      logger,
      overrides,
      createTrigger,
      platform,
      snapshotCode,
    );
  }

  // Check for transformer simulation
  const transformerSimulateEntry = overrides.transformers
    ? Object.entries(overrides.transformers).find(([, t]) => t.simulate)
    : undefined;

  if (transformerSimulateEntry) {
    const [transformerId] = transformerSimulateEntry;
    return executeTransformerSimulation(
      tempPath,
      validatedEvent,
      logger,
      transformerId,
      overrides,
      platform,
      snapshotCode,
    );
  }

  // Check for destination simulation
  const simulatedDestEntry = overrides.destinations
    ? Object.entries(overrides.destinations).find(([, d]) => d.simulate)
    : undefined;

  logger.debug(
    `Executing in ${platform} environment (${platform === 'web' ? 'JSDOM' : 'Node.js'})`,
  );

  if (simulatedDestEntry) {
    return executeSimulatedDestination(
      tempPath,
      validatedEvent,
      logger,
      platform,
      simulatedDestEntry[0],
      overrides,
      snapshotCode,
      platform === 'server' ? 60000 : undefined,
    );
  }

  return executeDestinationPush(
    tempPath,
    validatedEvent,
    logger,
    platform,
    overrides,
    snapshotCode,
    platform === 'server' ? 60000 : undefined,
  );
}

/**
 * Execute push from pre-built bundle
 */
async function executeBundlePush(
  bundleContent: string,
  platform: Platform,
  validatedEvent: { name: string; data: Record<string, unknown> },
  logger: Logger.Instance,
  setTempDir: (dir: string) => void,
  overrides: PushOverrides = {},
  snapshotCode?: string,
): Promise<PushResult> {
  // Write bundle to temp file
  const tempDir = getTmpPath(
    undefined,
    `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  setTempDir(tempDir);
  await fs.ensureDir(tempDir);
  const tempPath = path.join(tempDir, 'bundle.mjs');
  await fs.writeFile(tempPath, bundleContent, 'utf8');

  logger.debug(`Bundle written to: ${tempPath}`);

  // Execute destination push
  logger.debug(
    `Executing in ${platform} environment (${platform === 'web' ? 'JSDOM' : 'Node.js'})`,
  );
  return executeDestinationPush(
    tempPath,
    validatedEvent,
    logger,
    platform,
    overrides,
    snapshotCode,
    platform === 'server' ? 60000 : undefined,
  );
}

/**
 * Typed event input for push command
 */
interface PushEventInput {
  name: string;
  data: Record<string, unknown>;
  // Source simulation fields
  content?: unknown;
  trigger?: {
    type?: string;
    options?: unknown;
  };
}

/**
 * Execute non-simulated destination push (full pipeline).
 * Uses withFlowContext for environment setup and cleanup.
 */
async function executeDestinationPush(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  platform: 'web' | 'server',
  overrides?: PushOverrides,
  snapshotCode?: string,
  timeout?: number,
): Promise<PushResult> {
  const startTime = Date.now();
  const networkCalls: NetworkCall[] = [];

  return withFlowContext(
    { esmPath, platform, logger, snapshotCode, timeout, networkCalls },
    async (module) => {
      const config = module.wireConfig(module.__configData ?? undefined);
      const { trackingCalls } = applyOverrides(config, overrides || {});

      const result = await module.startFlow(config);
      if (!result?.collector?.push)
        throw new Error('Invalid bundle: collector missing push');

      const collector = result.collector;

      logger.info(`Pushing event: ${event.name}`);
      const elbResult = await collector.push({
        name: event.name,
        data: event.data,
      });

      await collector.command('shutdown');

      const usage = buildUsage(trackingCalls);

      return {
        success: true,
        elbResult: elbResult as PushResult['elbResult'],
        ...(Object.keys(usage).length > 0 ? { usage } : {}),
        ...(networkCalls.length > 0 ? { networkCalls } : {}),
        duration: Date.now() - startTime,
      };
    },
  );
}

/**
 * Execute isolated destination simulation.
 * Before chain → destinationInit → destinationPush → capture → stop.
 * No collector.push, no next chain, no other destinations.
 */
async function executeSimulatedDestination(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  platform: 'web' | 'server',
  destId: string,
  overrides: PushOverrides,
  snapshotCode?: string,
  timeout?: number,
): Promise<PushResult> {
  const startTime = Date.now();
  const networkCalls: NetworkCall[] = [];

  return withFlowContext(
    { esmPath, platform, logger, snapshotCode, timeout, networkCalls },
    async (module) => {
      const config = module.wireConfig(module.__configData ?? undefined);
      const { trackingCalls } = applyOverrides(config, overrides);

      // Don't initialize sources during destination simulation — unnecessary
      // overhead and server sources may bind ports or start listeners.
      if (config.sources) config.sources = {};

      const result = await module.startFlow(config);
      if (!result?.collector)
        throw new Error('Invalid bundle: collector not available');

      const collector = result.collector;
      const destination = collector.destinations[destId];
      if (!destination) {
        throw new Error(
          `Destination "${destId}" not found in collector. ` +
            `Available: ${Object.keys(collector.destinations || {}).join(', ') || 'none'}`,
        );
      }

      const ingest = createIngest(destId);

      // Run before chain (mandatory preparation)
      let processedEvent = {
        name: event.name,
        data: event.data,
      } as WalkerOS.Event;
      const before = destination.config.before;
      if (before && collector.transformers) {
        const beforeChainIds = resolveBeforeChain(
          before,
          collector.transformers,
          ingest,
          processedEvent,
        );
        if (beforeChainIds.length > 0) {
          logger.info(`Running before chain: ${beforeChainIds.join(' → ')}`);
          const beforeResult = await runTransformerChain(
            collector,
            collector.transformers,
            beforeChainIds,
            processedEvent,
            ingest,
            undefined,
            `destination.${destId}.before`,
          );
          if (beforeResult === null) {
            await collector.command('shutdown');
            return {
              success: true,
              captured: [
                { event: processedEvent, timestamp: Date.now() },
                { event: null, timestamp: Date.now() },
              ],
              duration: Date.now() - startTime,
            };
          }
          processedEvent = (
            Array.isArray(beforeResult) ? beforeResult[0] : beforeResult
          ) as WalkerOS.Event;
        }
      }

      // Initialize and push directly
      logger.info(`Simulating destination: ${destId}`);
      const isInitialized = await destinationInit(
        collector,
        destination,
        destId,
      );
      if (!isInitialized) {
        throw new Error(`Destination "${destId}" failed to initialize`);
      }

      const pushResult = await destinationPush(
        collector,
        destination,
        destId,
        processedEvent,
        ingest,
      );

      await collector.command('shutdown');

      const usage = buildUsage(trackingCalls);

      return {
        success: true,
        elbResult: pushResult as PushResult['elbResult'],
        ...(Object.keys(usage).length > 0 ? { usage } : {}),
        ...(networkCalls.length > 0 ? { networkCalls } : {}),
        duration: Date.now() - startTime,
      };
    },
  );
}

/**
 * Execute transformer simulation.
 *
 * Uses withFlowContext for environment setup. Calls startFlow to get a real
 * collector with initialized transformers, then calls transformerPush directly
 * on the target transformer. No collector.push, no pipeline traversal.
 *
 * Captured array: first entry = input event, subsequent entries = output event(s).
 * If the transformer drops the event (returns false), output event is null.
 */
async function executeTransformerSimulation(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  transformerId: string,
  overrides: PushOverrides,
  platform: 'web' | 'server',
  snapshotCode?: string,
): Promise<PushResult> {
  const startTime = Date.now();
  const networkCalls: NetworkCall[] = [];

  return withFlowContext(
    { esmPath, platform, logger, snapshotCode, networkCalls },
    async (module) => {
      const config = module.wireConfig(module.__configData ?? undefined);
      applyOverrides(config, overrides);

      // Don't initialize sources or destinations during transformer simulation.
      if (config.sources) config.sources = {};
      if (config.destinations) config.destinations = {};

      const result = await module.startFlow(config);
      if (!result?.collector)
        throw new Error('Invalid bundle: collector not available');

      const collector = result.collector;
      const transformer = collector.transformers?.[transformerId];

      if (!transformer) {
        throw new Error(
          `Transformer "${transformerId}" not found in collector. ` +
            `Available: ${Object.keys(collector.transformers || {}).join(', ') || 'none'}`,
        );
      }

      const initialized = await transformerInit(
        collector,
        transformer,
        transformerId,
      );
      if (!initialized) {
        throw new Error(`Transformer "${transformerId}" failed to initialize`);
      }

      const inputEvent = {
        name: event.name,
        data: event.data,
      } as WalkerOS.DeepPartialEvent;
      const ingest = createIngest(transformerId);
      const captured: Array<{ event: unknown; timestamp: number }> = [];

      captured.push({ event: { ...inputEvent }, timestamp: Date.now() });

      logger.info(`Simulating transformer: ${transformerId}`);

      // Run before chain if configured (mandatory preparation)
      let processedEvent: WalkerOS.DeepPartialEvent = inputEvent;
      const before = transformer.config.before;
      if (before && collector.transformers) {
        const beforeChainIds = resolveBeforeChain(
          before,
          collector.transformers,
          ingest,
          processedEvent,
        );
        if (beforeChainIds.length > 0) {
          const beforeResult = await runTransformerChain(
            collector,
            collector.transformers,
            beforeChainIds,
            processedEvent,
            ingest,
            undefined,
            `transformer.${transformerId}.before`,
          );
          if (beforeResult === null) {
            captured.push({ event: null, timestamp: Date.now() });
            await collector.command('shutdown');
            return {
              success: true,
              captured,
              duration: Date.now() - startTime,
            };
          }
          processedEvent = (
            Array.isArray(beforeResult) ? beforeResult[0] : beforeResult
          ) as WalkerOS.DeepPartialEvent;
        }
      }

      const pushResult = await transformerPush(
        collector,
        transformer,
        transformerId,
        processedEvent,
        ingest,
      );

      if (pushResult === false) {
        captured.push({ event: null, timestamp: Date.now() });
      } else if (Array.isArray(pushResult)) {
        for (const r of pushResult) {
          captured.push({
            event: r.event || processedEvent,
            timestamp: Date.now(),
          });
        }
      } else if (
        pushResult &&
        typeof pushResult === 'object' &&
        pushResult.event
      ) {
        captured.push({ event: pushResult.event, timestamp: Date.now() });
      } else {
        captured.push({ event: processedEvent, timestamp: Date.now() });
      }

      await collector.command('shutdown');

      return {
        success: true,
        captured,
        ...(networkCalls.length > 0 ? { networkCalls } : {}),
        duration: Date.now() - startTime,
      };
    },
  );
}

/**
 * Execute source simulation using createTrigger from the source package's /dev export.
 *
 * Uses withFlowContext for environment setup. createTrigger owns startFlow internally.
 * After createTrigger returns, we override collector.push with a capture-and-stop
 * function. This preserves the source's wrappedPush (and its before chain) while
 * preventing events from reaching destinations.
 */
async function executeSourceSimulation(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  overrides: PushOverrides,
  createTrigger: (...args: unknown[]) => Promise<{
    trigger: (
      type?: string,
      options?: unknown,
    ) => (content: unknown) => Promise<unknown>;
    flow?: {
      collector?: { command?: (...args: unknown[]) => Promise<unknown> };
    };
  }>,
  platform: 'web' | 'server',
  snapshotCode?: string,
): Promise<PushResult> {
  const startTime = Date.now();
  const networkCalls: NetworkCall[] = [];

  return withFlowContext(
    { esmPath, platform, logger, snapshotCode, networkCalls },
    async (module) => {
      const config = module.wireConfig(module.__configData ?? undefined);
      const { trackingCalls } = applyOverrides(config, overrides);

      // Capture array for events reaching collector.push boundary
      const captured: Array<{ event: unknown; timestamp: number }> = [];

      const instance = await createTrigger(config);
      const { trigger } = instance;

      // Override collector.push with capture-and-stop.
      // This preserves the source's wrappedPush (and its before chain)
      // while preventing events from reaching destinations.
      if (!instance.flow?.collector) {
        throw new Error(
          'Source createTrigger did not expose flow.collector. ' +
            'Cannot safely simulate without intercepting collector.push.',
        );
      }

      const collector = instance.flow.collector as Record<string, unknown>;
      collector.push = async (event: unknown) => {
        captured.push({ event, timestamp: Date.now() });
        return { ok: true };
      };

      logger.info('Simulating source');

      const content = event.content ?? event;
      await trigger(event.trigger?.type, event.trigger?.options)(content);

      if (instance.flow?.collector?.command) {
        await instance.flow.collector.command('shutdown');
      }

      const usage = buildUsage(trackingCalls);

      return {
        success: true,
        ...(captured.length > 0 ? { captured } : {}),
        ...(Object.keys(usage).length > 0 ? { usage } : {}),
        ...(networkCalls.length > 0 ? { networkCalls } : {}),
        duration: Date.now() - startTime,
      };
    },
  );
}

// Export types
export type { PushCommandOptions, PushResult };
