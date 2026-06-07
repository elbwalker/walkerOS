import path from 'path';
import fs from 'fs-extra';
import {
  createIngest,
  getPlatform,
  getNextSteps,
  buildCacheContext,
} from '@walkeros/core';
import {
  enrichEvent,
  transformerInit,
  transformerPush,
  runTransformerChain,
  wrapEnv,
} from '@walkeros/collector';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  getErrorMessage,
  detectInput,
  writeResult,
  type Platform,
} from '../../core/index.js';

import type {
  Flow,
  Ingest,
  Logger,
  Simulation,
  WalkerOS,
} from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import { loadFlowConfig, loadJsonConfig } from '../../config/index.js';
import { loadConfig } from '../../config/utils.js';
import { bundleCore } from '../bundle/bundler.js';
import type { NetworkCall, PushCommandOptions, PushResult } from './types.js';
import type { PushOptions } from '../../schemas/push.js';
import { buildOverrides, type PushOverrides } from './overrides.js';
import { applyOverrides } from './apply-overrides.js';
import { withFlowContext } from './flow-context.js';
import { buildSimulationResult } from './simulation-result.js';
import { prepareFlow } from './prepare.js';
import { schemas } from '@walkeros/core/dev';
import { runPushCommand } from './run.js';

/**
 * Narrow runtime check used by the CLI output formatter to read fields off
 * an opaque `elbResult`. Avoids spreading `as Record<string, unknown>`
 * everywhere a few fields are pulled.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * The trigger instance a source's `createTrigger` resolves to. `trigger`
 * fires a (type, options) trigger; the returned function takes the captured
 * content. `flow.collector.command` lets the simulator request a shutdown.
 * The bundle carries no compile-time types, so the simulator pins only the
 * members it actually reads and keeps the rest opaque.
 */
interface TriggerInstance {
  trigger: (
    type?: string,
    options?: unknown,
  ) => (content?: unknown) => Promise<unknown>;
  flow?: {
    collector?: {
      command?: (command: string) => Promise<unknown>;
    };
  };
}

/**
 * Signature of a source package's `createTrigger`, narrowed off the awaited
 * `/dev` module. The simulator only needs it to be callable and resolve to a
 * `TriggerInstance`; the bundle carries no compile-time types so the
 * parameters stay opaque.
 */
type CreateTrigger = (...args: unknown[]) => Promise<TriggerInstance>;

/**
 * Type predicate narrowing an opaque value to a callable. Used instead of a
 * cast so `getCreateTrigger` can return a precisely typed function without
 * the banned `Function` type or an `as` assertion.
 */
function isCallable(value: unknown): value is CreateTrigger {
  return typeof value === 'function';
}

/**
 * Narrow the awaited `/dev` module of a source package down to its
 * `examples.createTrigger`, validating each hop with `in`/`typeof` instead of
 * a cast. Returns `undefined` if any hop is missing or the wrong shape.
 */
function getCreateTrigger(devModule: unknown): CreateTrigger | undefined {
  if (!isRecord(devModule) || !('examples' in devModule)) return undefined;
  const examples = devModule.examples;
  if (!isRecord(examples) || !('createTrigger' in examples)) return undefined;
  const createTrigger = examples.createTrigger;
  return isCallable(createTrigger) ? createTrigger : undefined;
}

/**
 * Shape of a destination package's simulation `/dev` env, narrowed off the
 * awaited `/dev` module. `push` is the env object handed to the destination;
 * `simulation` lists `call:<fn>` markers the wrapper should track.
 */
interface DevEnv {
  push?: Record<string, unknown>;
  simulation?: string[];
}

/**
 * Narrow the awaited `/dev` module of a destination package down to its
 * `examples.env`, validating each hop with `in`/`typeof` instead of a cast.
 * Returns `undefined` if any hop is missing or the wrong shape.
 */
function getDevEnv(devModule: unknown): DevEnv | undefined {
  if (!isRecord(devModule) || !('examples' in devModule)) return undefined;
  const examples = devModule.examples;
  if (!isRecord(examples) || !('env' in examples)) return undefined;
  const env = examples.env;
  if (!isRecord(env)) return undefined;
  const result: DevEnv = {};
  if ('push' in env && isRecord(env.push)) result.push = env.push;
  if ('simulation' in env && isStringArray(env.simulation))
    result.simulation = env.simulation;
  return result;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/**
 * Walk a transformer chain via static `.next` links starting at `startId`.
 * Mirrors the collector's internal `walkChain` for the case where the
 * simulator already knows the entry-point id and the underlying chain is
 * static. Conditional `.next` shapes terminate the walk at this hop.
 */
function walkStaticChain(
  startId: string,
  transformers: import('@walkeros/core').Transformer.Transformers,
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = startId;

  while (current && transformers[current]) {
    if (visited.has(current)) break;
    visited.add(current);
    chain.push(current);

    const next: import('@walkeros/core').Transformer.Route | undefined =
      transformers[current].config?.next;
    if (typeof next === 'string') {
      current = next;
      continue;
    }
    if (Array.isArray(next) && next.every(isString)) {
      chain.push(...next);
      break;
    }
    // Conditional / undefined → terminate walk.
    break;
  }

  return chain;
}

/**
 * Resolve a before chain config to an ordered array of transformer IDs.
 * Uses `getNextSteps` for the entry points and follows static `.next`
 * links via `walkStaticChain`.
 */
function resolveBeforeChain(
  before: import('@walkeros/core').Transformer.Route | undefined,
  transformers: import('@walkeros/core').Transformer.Transformers,
  ingest?: import('@walkeros/core').Ingest,
  event?: WalkerOS.DeepPartialEvent,
): string[] {
  if (!before) return [];
  // Explicit string[] chain — use as-is.
  if (Array.isArray(before) && before.every(isString)) {
    return before;
  }
  const ids = getNextSteps(before, buildCacheContext(ingest, event));
  if (ids.length === 0) return [];
  if (ids.length === 1) return walkStaticChain(ids[0], transformers);
  return ids;
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
 * CLI command handler for push command.
 *
 * Thin wrapper around `runPushCommand`: delegates result production to the
 * pure helper, then formats output and decides the exit code. Tests target
 * `runPushCommand` directly to avoid `process.exit` killing Jest workers.
 */
export async function pushCommand(options: PushCommandOptions): Promise<void> {
  const result = await runPushCommand(options);
  const duration = result.duration;

  // Format result
  let output: string;
  if (options.json) {
    output = JSON.stringify({ ...result, duration }, null, 2);
  } else {
    const lines: string[] = [];
    // Reflect the actual outcome. `success: true` only when no destination
    // recorded a failure during init/push/destroy (see executeDestinationPush).
    lines.push(`success: ${result.success}`);
    if (result.success) {
      const elbResult = isRecord(result.elbResult)
        ? result.elbResult
        : undefined;
      if (elbResult) {
        if (typeof elbResult.id === 'string')
          lines.push(`  Event ID: ${elbResult.id}`);
        if (typeof elbResult.entity === 'string')
          lines.push(`  Entity: ${elbResult.entity}`);
        if (typeof elbResult.action === 'string')
          lines.push(`  Action: ${elbResult.action}`);
      }
    } else if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }
    lines.push(`  Duration: ${duration}ms`);
    output = lines.join('\n');
  }

  // Write to file or stdout
  await writeResult(output + '\n', { output: options.output });

  process.exit(result.success ? 0 : 1);
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
  const tempPath = path.join(tempDir, 'flow.mjs');

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
  const tempPath = path.join(tempDir, 'flow.mjs');
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
 *
 * Server platform deliberately disables timer interception and the drain
 * pump. Real `walkeros push` against destinations that use gRPC SDKs
 * (Pub/Sub, BigQuery, Kafka, AWS SDK v3, etc.) needs native Node timers:
 * those clients drive batch flush via `setTimeout` and keepalive via
 * `setInterval`, and intercepted timers break the gRPC client's state
 * machine, causing `topic.publishMessage()` to never resolve. Web platform
 * keeps interception + pump for backwards compatibility with destinations
 * whose init awaits a long captured timer (e.g. amplitude engagement
 * plugin) inside JSDOM. Simulate routes have their own call sites and
 * keep interception for deterministic snapshots.
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
  const isServer = platform === 'server';

  return withFlowContext(
    {
      esmPath,
      platform,
      logger,
      snapshotCode,
      timeout,
      // Network polyfills are JSDOM-only; on server real push we want real
      // network so omit the capture array.
      ...(isServer ? {} : { networkCalls }),
      // Server real push: native Node primitives, no interception.
      // Web real push: keep interception + pump (see fn-level docstring).
      ...(isServer
        ? {}
        : {
            asyncDrain: { timeout: 5000 },
            drainPump: true,
          }),
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

      // Any-fail policy: if any wired destination's init/push/destroy
      // logged a failure, surface it on the PushResult. The collector
      // tallies failures at `status.destinations[id].failed` (incremented
      // in collector/src/destination.ts both for init throws and for push
      // throws), and increments `status.failed` per occurrence.
      const failedIds = collectFailedDestinations(collector);
      const success = failedIds.length === 0;
      const error = success
        ? undefined
        : buildFailureSummary(failedIds, collector);

      return {
        success,
        ...(error !== undefined ? { error } : {}),
        elbResult: elbResult as PushResult['elbResult'],
        ...(networkCalls.length > 0 ? { networkCalls } : {}),
        duration: Date.now() - startTime,
      };
    },
  );
}

/**
 * Minimal view of the collector status surface we read here. We only need
 * the per-destination failure counter the collector already tracks; the
 * full Collector.Instance type is not exported through the dynamically
 * imported bundle, so we narrow it locally without `any`.
 */
interface CollectorStatusView {
  status?: {
    destinations?: Record<string, { failed?: number; count?: number }>;
  };
  destinations?: Record<string, { type?: string }>;
}

/**
 * Read the failed-destination ids from the collector after shutdown.
 * Returns ids whose `status.destinations[id].failed` is > 0.
 */
function collectFailedDestinations(collector: unknown): string[] {
  if (collector === null || typeof collector !== 'object') return [];
  const view = collector as CollectorStatusView;
  const destStatus = view.status?.destinations;
  if (!destStatus) return [];
  const failed: string[] = [];
  for (const [id, s] of Object.entries(destStatus)) {
    if (s && typeof s.failed === 'number' && s.failed > 0) failed.push(id);
  }
  return failed;
}

/**
 * Build a single-line, public-safe failure summary. We intentionally do
 * NOT include inner error messages or stack traces here: a server
 * endpoint that returns `PushResult` to a client must not leak
 * destination-internal errors. Detailed error context already flows
 * through the destination's scoped logger.
 */
function buildFailureSummary(failedIds: string[], collector: unknown): string {
  const view = (
    collector !== null && typeof collector === 'object' ? collector : {}
  ) as CollectorStatusView;
  const dests = view.destinations ?? {};
  const labels = failedIds.map((id) => {
    const type = dests[id]?.type;
    return type ? `${id} (${type})` : id;
  });
  const noun = failedIds.length === 1 ? 'destination' : 'destinations';
  return `Push failed for ${noun}: ${labels.join(', ')}`;
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
  configOrPath: string | Flow.Json,
  input: unknown,
  options: SimulateSourceOptions,
): Promise<Simulation.Result> {
  const startTime = Date.now();

  // Resolve config: accept either file path or config object
  let config: Flow.Json;
  if (typeof configOrPath === 'string') {
    config = (await loadJsonConfig(configOrPath)) as Flow.Json;
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

    return await withFlowContext<Simulation.Result>(
      {
        esmPath: prepared.bundlePath,
        platform: prepared.platform,
        logger,
        snapshotCode,
        networkCalls,
      },
      async (module) => {
        // Look up createTrigger from the lazy __devExports registry: await the
        // thunk to pull the /dev module in, then narrow without a cast.
        const loadDev = module.__devExports?.[sourceConfig!.package!];
        const devModule =
          typeof loadDev === 'function' ? await loadDev() : undefined;
        const createTrigger = getCreateTrigger(devModule);
        if (!createTrigger) {
          throw new Error(
            `Source package "${sourceConfig!.package}" has no createTrigger in /dev export`,
          );
        }

        const flowConfig = module.wireConfig(module.__configData ?? undefined);
        applyOverrides(flowConfig, prepared.overrides);

        // Capture events at the collector.push boundary via prePush hook.
        // Hook is wired by startFlow (inside createTrigger) before events fire.
        const captured: Array<{
          event: WalkerOS.DeepPartialEvent;
          timestamp: number;
        }> = [];

        flowConfig.hooks = {
          ...((flowConfig.hooks as Record<string, unknown>) || {}),
          prePush: (
            { fn }: { fn: Function },
            event: WalkerOS.DeepPartialEvent,
          ) => {
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

        return buildSimulationResult({
          step: 'source',
          name: options.sourceId,
          startTime,
          captured,
        });
      },
      (error) =>
        buildSimulationResult({
          step: 'source',
          name: options.sourceId,
          startTime,
          error,
        }),
    );
  } catch (error) {
    return buildSimulationResult({
      step: 'source',
      name: options.sourceId,
      startTime,
      error,
    });
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
  /**
   * Pipeline context the transformer reads via `ctx.ingest` (e.g. a decoder
   * reads `ingest.url`). Merged onto a fresh ingest so `_meta` is always
   * present; provide only the keys the step reads.
   */
  ingest?: Omit<Ingest, '_meta'>;
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
  configOrPath: string | Flow.Json,
  event: WalkerOS.DeepPartialEvent,
  options: SimulateTransformerOptions,
): Promise<Simulation.Result> {
  const startTime = Date.now();

  // Validate event with Zod
  const parsed = schemas.PartialEventSchema.safeParse(event);
  if (!parsed.success) {
    return buildSimulationResult({
      step: 'transformer',
      name: options.transformerId,
      startTime,
      error: parsed.error.message,
    });
  }

  // Resolve config: accept either file path or config object
  let config: Flow.Json;
  if (typeof configOrPath === 'string') {
    config = (await loadJsonConfig(configOrPath)) as Flow.Json;
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

    return await withFlowContext<Simulation.Result>(
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
        const ingest = {
          ...createIngest(options.transformerId),
          ...options.ingest,
        };
        // Output events only: each entry is a transformer output, or `null`
        // when the event was dropped. `buildSimulationResult` drops null
        // entries so a drop yields `events: []` and a passthrough yields
        // `events: [<event>]`.
        const captured: Array<{
          event: WalkerOS.DeepPartialEvent | null;
          timestamp: number;
        }> = [];

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
              return buildSimulationResult({
                step: 'transformer',
                name: options.transformerId,
                startTime,
                captured,
              });
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

        return buildSimulationResult({
          step: 'transformer',
          name: options.transformerId,
          startTime,
          captured,
        });
      },
      (error) =>
        buildSimulationResult({
          step: 'transformer',
          name: options.transformerId,
          startTime,
          error,
        }),
    );
  } catch (error) {
    return buildSimulationResult({
      step: 'transformer',
      name: options.transformerId,
      startTime,
      error,
    });
  } finally {
    await prepared.cleanup();
  }
}

export interface SimulateCollectorOptions {
  collectorName: string;
  bundlePath?: string;
  flow?: string;
  silent?: boolean;
  verbose?: boolean;
  snapshot?: string;
  state?: {
    consent?: WalkerOS.Consent;
    user?: WalkerOS.User;
    globals?: WalkerOS.Properties;
    timing?: number; // sets collector.timing, the base from which prepareEvent computes the relative event.timing
  };
}

/**
 * Self-contained collector enrichment simulation.
 *
 * Takes a post-next `DeepPartialEvent` and an optional collector-state
 * snapshot, then returns the fully enriched event the runtime produces between
 * the pre-collector `next` chain and the post-collector `before` chain. Reuses
 * the runtime's own enrichment (`enrichEvent`); it does not reimplement it.
 */
export async function simulateCollector(
  configOrPath: string | Flow.Json,
  event: WalkerOS.DeepPartialEvent,
  options: SimulateCollectorOptions,
): Promise<Simulation.Result> {
  const startTime = Date.now();

  // Validate event with Zod
  const parsed = schemas.PartialEventSchema.safeParse(event);
  if (!parsed.success) {
    return buildSimulationResult({
      step: 'collector',
      name: options.collectorName,
      startTime,
      error: parsed.error.message,
    });
  }

  // Resolve config: accept either file path or config object
  let config: Flow.Json;
  if (typeof configOrPath === 'string') {
    config = (await loadJsonConfig(configOrPath)) as Flow.Json;
  } else {
    config = configOrPath;
  }

  const prepareInput = options.bundlePath
    ? {
        mode: 'prebuilt' as const,
        bundlePath: options.bundlePath,
        config,
        flow: options.flow,
        simulate: ['collector.' + options.collectorName],
        silent: options.silent,
        verbose: options.verbose,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['collector.' + options.collectorName],
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

    return await withFlowContext<Simulation.Result>(
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

        // Don't initialize sources or destinations during collector enrichment.
        if (flowConfig.sources) flowConfig.sources = {};
        if (flowConfig.destinations) flowConfig.destinations = {};

        const result = await module.startFlow(flowConfig);
        if (!result?.collector)
          throw new Error('Invalid bundle: collector not available');

        const collector = result.collector;

        // Seed collector state from the snapshot. These are plain mutable
        // instance props; pure enrichment needs no `run()`.
        if (options.state) {
          if (options.state.consent !== undefined)
            collector.consent = options.state.consent;
          if (options.state.user !== undefined)
            collector.user = options.state.user;
          if (options.state.globals !== undefined)
            collector.globals = options.state.globals;
          if (options.state.timing !== undefined)
            collector.timing = options.state.timing;
        }

        const enriched = enrichEvent(collector, event);

        const captured: Array<{
          event: WalkerOS.DeepPartialEvent | null;
          timestamp: number;
        }> = [{ event: enriched, timestamp: Date.now() }];

        await collector.command('shutdown');

        return buildSimulationResult({
          step: 'collector',
          name: options.collectorName,
          startTime,
          captured,
        });
      },
      (error) =>
        buildSimulationResult({
          step: 'collector',
          name: options.collectorName,
          startTime,
          error,
        }),
    );
  } catch (error) {
    return buildSimulationResult({
      step: 'collector',
      name: options.collectorName,
      startTime,
      error,
    });
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
  configOrPath: string | Flow.Json,
  event: WalkerOS.DeepPartialEvent,
  options: SimulateDestinationOptions,
): Promise<Simulation.Result> {
  const startTime = Date.now();

  // Validate event with Zod
  const parsed = schemas.PartialEventSchema.safeParse(event);
  if (!parsed.success) {
    return buildSimulationResult({
      step: 'destination',
      name: options.destinationId,
      startTime,
      error: parsed.error.message,
    });
  }

  // Resolve config: accept either file path or config object
  let config: Flow.Json;
  if (typeof configOrPath === 'string') {
    config = (await loadJsonConfig(configOrPath)) as Flow.Json;
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

    return await withFlowContext<Simulation.Result>(
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
          // Await the lazy __devExports thunk, then narrow without a cast.
          const loadDev = module.__devExports?.[destPkg.package];
          const devModule =
            typeof loadDev === 'function' ? await loadDev() : undefined;
          const devEnv = getDevEnv(devModule);

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
        await collector.push(event, {
          include: [options.destinationId],
        });

        await collector.command('shutdown');

        return buildSimulationResult({
          step: 'destination',
          name: options.destinationId,
          startTime,
          usage: trackedCalls.length
            ? { [options.destinationId]: trackedCalls }
            : undefined,
        });
      },
      (error) =>
        buildSimulationResult({
          step: 'destination',
          name: options.destinationId,
          startTime,
          error,
        }),
    );
  } catch (error) {
    return buildSimulationResult({
      step: 'destination',
      name: options.destinationId,
      startTime,
      error,
    });
  } finally {
    await prepared.cleanup();
  }
}

// Export types
export type { PushCommandOptions, PushResult };
