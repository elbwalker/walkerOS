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
  transformerInit,
  transformerPush,
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
  wrapEnv,
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

import type { Flow, Logger, WalkerOS } from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import {
  loadFlowConfig,
  loadJsonConfig,
  loadJsonFromSource,
} from '../../config/index.js';
import { loadConfig } from '../../config/utils.js';
import { bundleCore } from '../bundle/bundler.js';
import type { NetworkCall, PushCommandOptions, PushResult } from './types.js';
import type { PushOptions } from '../../schemas/push.js';
import { buildOverrides, type PushOverrides } from './overrides.js';
import { applyOverrides } from './apply-overrides.js';
import { withFlowContext } from './flow-context.js';
import { prepareFlow } from './prepare.js';
import { schemas } from '@walkeros/core/dev';

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
          mock: options.mock,
        } as PushCommandOptions,
        event as Record<string, unknown>,
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
        event as Record<string, unknown>,
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

    // Resolve string event inputs
    let resolvedEvent: unknown = options.event;
    if (typeof options.event === 'string') {
      resolvedEvent = await loadJsonFromSource(options.event, {
        name: 'event',
      });
    }

    // Route to typed function based on --simulate flag
    const simulateFlag = options.simulate?.[0];
    let result: PushResult;

    if (simulateFlag?.startsWith('source.')) {
      result = await simulateSource(config, resolvedEvent, {
        sourceId: simulateFlag.replace('source.', ''),
        flow: options.flow,
        silent: options.silent,
        verbose: options.verbose,
        snapshot: options.snapshot,
      });
    } else if (simulateFlag?.startsWith('transformer.')) {
      result = await simulateTransformer(
        config,
        resolvedEvent as WalkerOS.DeepPartialEvent,
        {
          transformerId: simulateFlag.replace('transformer.', ''),
          flow: options.flow,
          mock: options.mock,
          silent: options.silent,
          verbose: options.verbose,
          snapshot: options.snapshot,
        },
      );
    } else if (simulateFlag?.startsWith('destination.')) {
      result = await simulateDestination(
        config,
        resolvedEvent as WalkerOS.DeepPartialEvent,
        {
          destinationId: simulateFlag.replace('destination.', ''),
          flow: options.flow,
          mock: options.mock,
          silent: options.silent,
          verbose: options.verbose,
          snapshot: options.snapshot,
        },
      );
    } else {
      result = await push(config, resolvedEvent, {
        flow: options.flow,
        json: options.json,
        verbose: options.verbose,
        silent: options.silent,
        platform: options.platform as Platform | undefined,
        mock: options.mock,
        snapshot: options.snapshot,
      });
    }

    const duration = Date.now() - startTime;

    // Format result
    let output: string;
    if (options.json) {
      output = JSON.stringify({ ...result, duration }, null, 2);
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

  // Validate with Zod
  const parsed = schemas.PartialEventSchema.safeParse(event);
  if (!parsed.success) {
    return {
      success: false,
      duration: 0,
      error: `Invalid event: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
    };
  }

  return pushCore(configOrPath, event, {
    json: options.json ?? false,
    verbose: options.verbose ?? false,
    silent: options.silent ?? false,
    flow: options.flow,
    platform: options.platform,
    mock: options.mock,
    snapshot: options.snapshot,
  });
}

/**
 * Execute push from config JSON (existing behavior)
 */
async function executeConfigPush(
  options: PushCommandOptions,
  validatedEvent: Record<string, unknown>,
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

  // Build overrides from --mock flags (simulate is handled upstream in push())
  const overrides = buildOverrides({ mock: options.mock }, flowSettings);

  // Bundle to temp file (env loading moved to __devExports in the bundle)
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

  logger.debug(
    `Executing in ${platform} environment (${platform === 'web' ? 'JSDOM' : 'Node.js'})`,
  );

  return executeDestinationPush(
    tempPath,
    validatedEvent as WalkerOS.DeepPartialEvent,
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
  validatedEvent: Record<string, unknown>,
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
    validatedEvent as WalkerOS.DeepPartialEvent,
    logger,
    platform,
    overrides,
    snapshotCode,
    platform === 'server' ? 60000 : undefined,
  );
}

/**
 * Execute non-simulated destination push (full pipeline).
 * Uses withFlowContext for environment setup and cleanup.
 */
async function executeDestinationPush(
  esmPath: string,
  event: WalkerOS.DeepPartialEvent,
  logger: Logger.Instance,
  platform: 'web' | 'server',
  overrides?: PushOverrides,
  snapshotCode?: string,
  timeout?: number,
): Promise<PushResult> {
  const startTime = Date.now();
  const networkCalls: NetworkCall[] = [];

  return withFlowContext(
    {
      esmPath,
      platform,
      logger,
      snapshotCode,
      timeout,
      networkCalls,
      asyncDrain: { timeout: 5000 },
    },
    async (module) => {
      const config = module.wireConfig(module.__configData ?? undefined);
      applyOverrides(config, overrides || {});

      const result = await module.startFlow(config);
      if (!result?.collector?.push)
        throw new Error('Invalid bundle: collector missing push');

      const collector = result.collector;

      logger.info(`Pushing event: ${event.name}`);
      const elbResult = await collector.push(event);

      await collector.command('shutdown');

      return {
        success: true,
        elbResult: elbResult as PushResult['elbResult'],
        ...(networkCalls.length > 0 ? { networkCalls } : {}),
        duration: Date.now() - startTime,
      };
    },
  );
}

export interface SimulateSourceOptions {
  sourceId: string;
  bundlePath?: string;
  flow?: string;
  silent?: boolean;
  verbose?: boolean;
  snapshot?: string;
}

/**
 * Self-contained source simulation.
 *
 * Loads the flow config, bundles it, resolves the source package's /dev export
 * to get createTrigger, then invokes the trigger inside a flow context with a
 * prePush hook that captures events before they reach destinations.
 *
 * The `input` parameter is `unknown` — the CLI is agnostic to source-specific
 * content shapes. The source's createTrigger defines what it expects.
 */
export async function simulateSource(
  configOrPath: string | Flow.Config,
  input: unknown,
  options: SimulateSourceOptions,
): Promise<PushResult> {
  const startTime = Date.now();

  // Resolve config: accept either file path or config object
  let config: Flow.Config;
  if (typeof configOrPath === 'string') {
    config = (await loadJsonConfig(configOrPath)) as Flow.Config;
  } else {
    config = configOrPath;
  }

  const prepareInput = options.bundlePath
    ? {
        mode: 'prebuilt' as const,
        bundlePath: options.bundlePath,
        config,
        flow: options.flow,
        simulate: ['source.' + options.sourceId],
        silent: options.silent,
        verbose: options.verbose,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['source.' + options.sourceId],
        silent: options.silent,
        verbose: options.verbose,
      };

  const prepared = await prepareFlow(prepareInput);

  try {
    const logger = createCLILogger({
      silent: options.silent,
      verbose: options.verbose,
    });

    // Resolve source package name (needed for __devExports lookup inside context)
    const sourceConfig = (prepared.flowSettings.sources ?? {})[
      options.sourceId
    ] as { package?: string } | undefined;

    if (!sourceConfig?.package) {
      throw new Error(`Source "${options.sourceId}" has no package defined`);
    }

    // Load snapshot code if provided
    let snapshotCode: string | undefined;
    if (options.snapshot) {
      snapshotCode = (await loadConfig(options.snapshot, {
        json: false,
      })) as string;
      logger.debug(`Snapshot loaded (${snapshotCode.length} bytes)`);
    }

    const networkCalls: NetworkCall[] = [];

    return await withFlowContext(
      {
        esmPath: prepared.bundlePath,
        platform: prepared.platform,
        logger,
        snapshotCode,
        networkCalls,
      },
      async (module) => {
        // Look up createTrigger from __devExports (bundled /dev export)
        const devExports = module.__devExports?.[sourceConfig!.package!] as
          | { examples?: { createTrigger?: Function } }
          | undefined;
        const createTrigger = devExports?.examples?.createTrigger;
        if (!createTrigger) {
          throw new Error(
            `Source package "${sourceConfig!.package}" has no createTrigger in /dev export`,
          );
        }

        const flowConfig = module.wireConfig(module.__configData ?? undefined);
        applyOverrides(flowConfig, prepared.overrides);

        // Capture events at the collector.push boundary via prePush hook.
        // Hook is wired by startFlow (inside createTrigger) before events fire.
        const captured: Array<{ event: unknown; timestamp: number }> = [];

        flowConfig.hooks = {
          ...((flowConfig.hooks as Record<string, unknown>) || {}),
          prePush: ({ fn }: { fn: Function }, event: unknown) => {
            captured.push({ event, timestamp: Date.now() });
            return { ok: true }; // Stop propagation — don't call fn
          },
        };

        const instance = await createTrigger(flowConfig, {
          sourceId: options.sourceId,
        });
        const { trigger } = instance;

        logger.info('Simulating source');

        // Extract content and trigger params from input — the CLI doesn't type
        // these, it just reads them as generic properties from the unknown input.
        const inputRecord = (input ?? {}) as Record<string, unknown>;
        const content = inputRecord.content ?? input;
        const triggerOpts = inputRecord.trigger as
          | { type?: string; options?: unknown }
          | undefined;
        await trigger(triggerOpts?.type, triggerOpts?.options)(content);

        if (instance.flow?.collector?.command) {
          await instance.flow.collector.command('shutdown');
        }

        return {
          success: true,
          ...(captured.length > 0 ? { captured } : {}),
          ...(networkCalls.length > 0 ? { networkCalls } : {}),
          duration: Date.now() - startTime,
        };
      },
    );
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    await prepared.cleanup();
  }
}

export interface SimulateTransformerOptions {
  transformerId: string;
  bundlePath?: string;
  flow?: string;
  mock?: string[];
  silent?: boolean;
  verbose?: boolean;
  snapshot?: string;
}

/**
 * Self-contained transformer simulation.
 *
 * Takes a DeepPartialEvent, validates it with Zod, loads the flow config,
 * bundles it, starts the flow to get initialized transformers, then runs
 * the event through the target transformer (with optional before chain).
 *
 * Captured array: first entry = input event, subsequent entries = output event(s).
 * If the transformer drops the event (returns false), output event is null.
 */
export async function simulateTransformer(
  configOrPath: string | Flow.Config,
  event: WalkerOS.DeepPartialEvent,
  options: SimulateTransformerOptions,
): Promise<PushResult> {
  const startTime = Date.now();

  // Validate event with Zod
  const parsed = schemas.PartialEventSchema.safeParse(event);
  if (!parsed.success) {
    return {
      success: false,
      duration: 0,
      error: parsed.error.message,
    };
  }

  // Resolve config: accept either file path or config object
  let config: Flow.Config;
  if (typeof configOrPath === 'string') {
    config = (await loadJsonConfig(configOrPath)) as Flow.Config;
  } else {
    config = configOrPath;
  }

  const prepareInput = options.bundlePath
    ? {
        mode: 'prebuilt' as const,
        bundlePath: options.bundlePath,
        config,
        flow: options.flow,
        simulate: ['transformer.' + options.transformerId],
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['transformer.' + options.transformerId],
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
      };

  const prepared = await prepareFlow(prepareInput);

  try {
    const logger = createCLILogger({
      silent: options.silent,
      verbose: options.verbose,
    });

    // Load snapshot code if provided
    let snapshotCode: string | undefined;
    if (options.snapshot) {
      snapshotCode = (await loadConfig(options.snapshot, {
        json: false,
      })) as string;
      logger.debug(`Snapshot loaded (${snapshotCode.length} bytes)`);
    }

    const networkCalls: NetworkCall[] = [];

    return await withFlowContext(
      {
        esmPath: prepared.bundlePath,
        platform: prepared.platform,
        logger,
        snapshotCode,
        networkCalls,
      },
      async (module) => {
        const flowConfig = module.wireConfig(module.__configData ?? undefined);
        applyOverrides(flowConfig, prepared.overrides);

        // Don't initialize sources or destinations during transformer simulation.
        if (flowConfig.sources) flowConfig.sources = {};
        if (flowConfig.destinations) flowConfig.destinations = {};

        const result = await module.startFlow(flowConfig);
        if (!result?.collector)
          throw new Error('Invalid bundle: collector not available');

        const collector = result.collector;
        const transformer = collector.transformers?.[options.transformerId];

        if (!transformer) {
          throw new Error(
            `Transformer "${options.transformerId}" not found in collector. ` +
              `Available: ${Object.keys(collector.transformers || {}).join(', ') || 'none'}`,
          );
        }

        const initialized = await transformerInit(
          collector,
          transformer,
          options.transformerId,
        );
        if (!initialized) {
          throw new Error(
            `Transformer "${options.transformerId}" failed to initialize`,
          );
        }

        const inputEvent = event;
        const ingest = createIngest(options.transformerId);
        const captured: Array<{ event: unknown; timestamp: number }> = [];

        captured.push({ event: { ...inputEvent }, timestamp: Date.now() });

        logger.info(`Simulating transformer: ${options.transformerId}`);

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
              `transformer.${options.transformerId}.before`,
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
          options.transformerId,
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
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    await prepared.cleanup();
  }
}

export interface SimulateDestinationOptions {
  destinationId: string;
  bundlePath?: string;
  flow?: string;
  mock?: string[];
  silent?: boolean;
  verbose?: boolean;
  snapshot?: string;
}

/**
 * Self-contained destination simulation.
 *
 * Takes a DeepPartialEvent, validates it with Zod, loads the flow config,
 * bundles it, starts the flow, then pushes via collector.push with an include
 * filter so only the target destination receives the event. This gives full
 * pipeline support — consent checks, event mapping, createEvent enrichment,
 * before chains — without manual wiring.
 */
export async function simulateDestination(
  configOrPath: string | Flow.Config,
  event: WalkerOS.DeepPartialEvent,
  options: SimulateDestinationOptions,
): Promise<PushResult> {
  const startTime = Date.now();

  // Validate event with Zod
  const parsed = schemas.PartialEventSchema.safeParse(event);
  if (!parsed.success) {
    return {
      success: false,
      duration: 0,
      error: parsed.error.message,
    };
  }

  // Resolve config: accept either file path or config object
  let config: Flow.Config;
  if (typeof configOrPath === 'string') {
    config = (await loadJsonConfig(configOrPath)) as Flow.Config;
  } else {
    config = configOrPath;
  }

  const prepareInput = options.bundlePath
    ? {
        mode: 'prebuilt' as const,
        bundlePath: options.bundlePath,
        config,
        flow: options.flow,
        simulate: ['destination.' + options.destinationId],
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['destination.' + options.destinationId],
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
      };

  const prepared = await prepareFlow(prepareInput);

  try {
    const logger = createCLILogger({
      silent: options.silent,
      verbose: options.verbose,
    });

    let snapshotCode: string | undefined;
    if (options.snapshot) {
      snapshotCode = (await loadConfig(options.snapshot, {
        json: false,
      })) as string;
    }

    const networkCalls: NetworkCall[] = [];

    return await withFlowContext(
      {
        esmPath: prepared.bundlePath,
        platform: prepared.platform,
        logger,
        snapshotCode,
        networkCalls,
      },
      async (module) => {
        const flowConfig = module.wireConfig(module.__configData ?? undefined);
        applyOverrides(flowConfig, prepared.overrides);

        // Read env from bundled __devExports
        const destPkg = (prepared.flowSettings.destinations ?? {})[
          options.destinationId
        ] as { package?: string } | undefined;
        let trackedCalls: Array<{
          fn: string;
          args: unknown[];
          ts: number;
        }> = [];

        if (destPkg?.package) {
          const devExports = module.__devExports?.[destPkg.package] as
            | {
                examples?: {
                  env?: {
                    push?: Record<string, unknown>;
                    simulation?: string[];
                  };
                };
              }
            | undefined;
          const devEnv = devExports?.examples?.env;

          if (devEnv?.push) {
            const destinations = flowConfig.destinations as Record<
              string,
              { config?: { env?: Record<string, unknown> } }
            >;
            const destConfig = destinations[options.destinationId]?.config;
            if (destConfig) {
              destConfig.env = devEnv.push;
            }

            if (devEnv.simulation?.length) {
              const combined = {
                ...devEnv.push,
                simulation: devEnv.simulation,
              };
              const { wrappedEnv, calls } = wrapEnv(combined);
              if (destConfig) destConfig.env = wrappedEnv;
              trackedCalls = calls;
            }
          }
        }

        // Don't initialize sources — unnecessary overhead
        if (flowConfig.sources) flowConfig.sources = {};

        const result = await module.startFlow(flowConfig);
        if (!result?.collector)
          throw new Error('Invalid bundle: collector not available');

        const collector = result.collector;

        // Verify destination exists (check both active and pending)
        if (
          !collector.destinations[options.destinationId] &&
          !collector.pending.destinations[options.destinationId]
        ) {
          throw new Error(
            `Destination "${options.destinationId}" not found in collector. ` +
              `Available: ${Object.keys(collector.destinations || {}).join(', ') || 'none'}`,
          );
        }

        logger.info(`Simulating destination: ${options.destinationId}`);

        // Full pipeline: consent, mapping, enrichment, before chains
        // include filter ensures only the target destination receives the event
        const elbResult = await collector.push(event, {
          include: [options.destinationId],
        });

        await collector.command('shutdown');

        return {
          success: true,
          elbResult: elbResult as PushResult['elbResult'],
          ...(trackedCalls.length > 0
            ? { usage: { [options.destinationId]: trackedCalls } }
            : {}),
          ...(networkCalls.length > 0 ? { networkCalls } : {}),
          duration: Date.now() - startTime,
        };
      },
    );
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    await prepared.cleanup();
  }
}

// Export types
export type { PushCommandOptions, PushResult };
