import path from 'path';
import fs from 'fs-extra';
import { createIngest, getPlatform, stepId } from '@walkeros/core';
import {
  enrichEvent,
  transformerInit,
  runCollectorNext,
  runTransformerChain,
  wrapEnv,
} from '@walkeros/collector';
import {
  createCLILogger,
  createCLILoggerConfig,
} from '../../core/cli-logger.js';
import {
  getErrorMessage,
  detectInput,
  writeResult,
  type Platform,
} from '../../core/index.js';

import type {
  Collector,
  Flow,
  FlowState,
  Ingest,
  Logger,
  Simulation,
  WalkerOS,
} from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import { scrubSecrets } from '../../core/redact-line.js';
import { toPrintable } from '../../core/to-printable.js';
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
import { runPushCommandWithSecrets } from './run.js';
import { collectKnownSecrets } from '../../core/known-secrets.js';
import { legacyExportRefusal, selectDevExamples } from './dev-examples.js';
import { resolveExportName } from '../../core/resolve-export-name.js';

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
 * Narrow the awaited `/dev` module of a source package down to the
 * `createTrigger` of the step's export (see `selectDevExamples`), validating
 * each hop with `in`/`typeof` instead of a cast. Returns `undefined` if any
 * hop is missing or the wrong shape.
 */
function getCreateTrigger(
  devModule: unknown,
  exportName: string | undefined,
): CreateTrigger | undefined {
  const examples = selectDevExamples(devModule, exportName);
  if (!examples || !('createTrigger' in examples)) return undefined;
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
 * Narrow the awaited `/dev` module of a package down to the `examples.env` of
 * the step's export (see `selectDevExamples`), validating each hop with
 * `in`/`typeof` instead of a cast. Returns `undefined` if any hop is missing
 * or the wrong shape.
 */
function getDevEnv(
  devModule: unknown,
  exportName: string | undefined,
): DevEnv | undefined {
  const examples = selectDevExamples(devModule, exportName);
  if (!examples || !('env' in examples)) return undefined;
  const env = examples.env;
  if (!isRecord(env)) return undefined;
  const result: DevEnv = {};
  if ('push' in env && isRecord(env.push)) result.push = env.push;
  if ('simulation' in env && isStringArray(env.simulation))
    result.simulation = env.simulation;
  return result;
}

/**
 * Injects each flow store's dev-examples mock env (`examples.env.push` of
 * the store's export, resolved like steps) before `startFlow`, so a store
 * that reaches the network at start (Sheets existence check, token
 * exchange) runs against its mock in every simulation. The store definition
 * object is mutated in place: `$store.<id>` env references resolve by
 * identity. A store whose package ships no mock env (fs, memory: local
 * only) runs as configured; its id is returned for a debug line.
 */
export async function applyStoreMockEnvs(
  flowConfig: { stores?: unknown },
  flowSettings: Flow,
  devExports: Record<string, () => Promise<unknown>> | undefined,
): Promise<string[]> {
  const unmocked: string[] = [];
  const stores = flowConfig.stores;
  if (!isRecord(stores)) return unmocked;

  for (const [storeId, storeDef] of Object.entries(stores)) {
    const packageName = flowSettings.stores?.[storeId]?.package;
    const loadDev = packageName ? devExports?.[packageName] : undefined;
    const devModule =
      typeof loadDev === 'function' ? await loadDev() : undefined;
    const { exportName } = resolveExportName(flowSettings, 'store', storeId);
    const push = getDevEnv(devModule, exportName)?.push;

    if (!push || !isRecord(storeDef)) {
      unmocked.push(storeId);
      continue;
    }

    // `context.env` (the def's top-level `env`) is read first by the store
    // packages, so the mock replaces it and always wins over a configured
    // env. Assigned by reference: a mock's getters stay live.
    storeDef.env = push;
  }

  return unmocked;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/** How the running flow logs: `json` routes its logs to stderr. */
interface FlowLogOptions {
  json?: boolean;
  silent?: boolean;
  verbose?: boolean;
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
    stderr: options.json,
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
          json: options.json,
          silent: options.silent,
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
        options,
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
  const { result, knownSecrets } = await runPushCommandWithSecrets(options);
  const output = renderPushOutput(result, {
    json: options.json,
    knownSecrets,
  });

  // Write to file or stdout
  await writeResult(output + '\n', { output: options.output });

  process.exit(result.success ? 0 : 1);
}

/**
 * The `walkeros push` output (`--json` or text). Simulate output carries the
 * recorded vendor calls, whose arguments can hold credentials. It egresses
 * like a log line: serialize, then scrub, masking the values of the secrets
 * the flow references (`knownSecrets`) whatever their shape.
 */
export function renderPushOutput(
  result: PushResult,
  options: { json?: boolean; knownSecrets?: readonly string[] } = {},
): string {
  const knownSecrets = options.knownSecrets ?? [];
  return scrubSecrets(
    options.json
      ? JSON.stringify(toPrintable(result), null, 2)
      : formatPushResult(result, { knownSecrets }),
    { known: knownSecrets },
  );
}

const MAX_CALL_ARGS_LENGTH = 300;

/** Compact JSON of one printable value; `undefined` has no JSON form. */
function compactJson(value: unknown): string {
  return JSON.stringify(toPrintable(value)) ?? 'undefined';
}

/**
 * One call's arguments as compact JSON, cut at 300 chars. Scrubbed before the
 * cut so a secret straddling the cut cannot lose the context that marks it.
 */
function formatCallArgs(
  args: unknown[],
  knownSecrets: readonly string[],
): string {
  const text = scrubSecrets(args.map(compactJson).join(','), {
    known: knownSecrets,
  });
  return text.length > MAX_CALL_ARGS_LENGTH
    ? `${text.slice(0, MAX_CALL_ARGS_LENGTH - 3)}...`
    : text;
}

/** `granted functional, marketing` style list of the granted keys. */
function grantedKeys(consent: WalkerOS.Consent | undefined): string {
  const keys = Object.entries(consent ?? {})
    .filter(([, granted]) => granted)
    .map(([key]) => key);
  return keys.length > 0 ? keys.join(', ') : 'none';
}

/** One line saying why a simulated destination sent nothing. */
function formatSkipped(skipped: Simulation.Skipped): string {
  if (skipped.reason === 'pending') {
    const waits = skipped.require?.length ? skipped.require.join(', ') : '';
    return `    pending: waits for ${waits || 'its require'} (require)`;
  }
  return `    skipped: consent (requires ${grantedKeys(skipped.required)}; granted ${grantedKeys(skipped.granted)})`;
}

function formatSimulation(
  simulation: Simulation.Result,
  knownSecrets: readonly string[],
): string[] {
  const lines = [`  ${simulation.step}.${simulation.name}`];
  if (simulation.error) {
    lines.push(`    error: ${simulation.error.message}`);
    return lines;
  }
  if (simulation.step === 'destination') {
    // No key with calls: the destination has no rule for the event and
    // pushed it as is. No key and no calls: it was skipped before mapping.
    const unmapped =
      simulation.calls.length > 0 ? 'none' : 'none (skipped before mapping)';
    lines.push(`    mapping: ${simulation.mappingKey ?? unmapped}`);
    if (simulation.skipped) lines.push(formatSkipped(simulation.skipped));
    for (const call of simulation.calls)
      lines.push(
        `    call ${call.fn}(${formatCallArgs(call.args, knownSecrets)})`,
      );
    if (simulation.calls.length === 0) lines.push('    no calls');
    return lines;
  }
  for (const call of simulation.calls)
    lines.push(
      `    call ${call.fn}(${formatCallArgs(call.args, knownSecrets)})`,
    );
  for (const event of simulation.events)
    lines.push(`    event ${formatCallArgs([event], knownSecrets)}`);
  if (simulation.events.length === 0) lines.push('    no events');
  return lines;
}

/**
 * Text output of `walkeros push`: the outcome, the push result or one block
 * per simulated step (its mapping, why nothing was sent, recorded calls), the
 * error, the duration. Call arguments are scrubbed here (before their cut),
 * masking `knownSecrets`; `pushCommand` scrubs the whole text at egress.
 */
export function formatPushResult(
  result: PushResult,
  options: { knownSecrets?: readonly string[] } = {},
): string {
  const knownSecrets = options.knownSecrets ?? [];
  const lines: string[] = [];
  // Reflect the actual outcome. `success: true` only when no destination
  // recorded a failure during init/push/destroy (see executeDestinationPush).
  lines.push(`success: ${result.success}`);
  if (result.success) {
    const elbResult = isRecord(result.elbResult) ? result.elbResult : undefined;
    if (elbResult) {
      if (typeof elbResult.id === 'string')
        lines.push(`  Event ID: ${elbResult.id}`);
      if (typeof elbResult.entity === 'string')
        lines.push(`  Entity: ${elbResult.entity}`);
      if (typeof elbResult.action === 'string')
        lines.push(`  Action: ${elbResult.action}`);
    }
  }
  for (const simulation of result.simulations ?? [])
    lines.push(...formatSimulation(simulation, knownSecrets));
  if (!result.success && result.error) lines.push(`  Error: ${result.error}`);
  lines.push(`  Duration: ${result.duration}ms`);
  return lines.join('\n');
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
    options,
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
  flowLogs: FlowLogOptions = {},
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
    flowLogs,
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
  flowLogs: FlowLogOptions = {},
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
      routeFlowLogs(config, flowLogs);

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

/**
 * Routes the running flow's own logs (collector, steps) through the CLI
 * handler. In `--json` mode stdout carries only the result, so they go to
 * stderr like the CLI's. A simulation always routes them, passing the values
 * of the secrets its flow references (`knownSecrets`) so every line is
 * masked; a real push without `--json` keeps the flow's own logger. The
 * flow's configured level still gates what reaches the handler.
 */
function routeFlowLogs(
  flowConfig: { logger?: Logger.Config },
  options: FlowLogOptions,
  knownSecrets?: readonly string[],
): void {
  if (!options.json && knownSecrets === undefined) return;
  const { handler } = createCLILoggerConfig({
    silent: options.silent,
    verbose: options.verbose,
    stderr: options.json,
    knownSecrets,
  });
  flowConfig.logger = { ...flowConfig.logger, handler };
}

/**
 * Shared data-injection seam for all simulate functions.
 */
export interface SimulateDataOptions {
  /**
   * Wire-config data payload to execute instead of the bundle's baked
   * `__configData`. Shape: the split-config data payload the bundler
   * emits (section, step id, data-layer props), as built by
   * `buildDataPayload`.
   *
   * The payload REPLACES the baked data, there is no deep-merge: build
   * the full payload from the full config. Injection granularity follows
   * the skeleton's `__data` references, which are emitted per TOP-LEVEL
   * step prop. Changed values for any nested key under an existing
   * top-level data prop (e.g. a new entity-action rule inside an existing
   * `mapping`) take effect without a rebundle. An entirely NEW top-level
   * data prop on a step has no `__data` reference in the skeleton, so it
   * is IGNORED by injection and requires a rebundle.
   */
  data?: Record<string, unknown>;
}

export interface SimulateSourceOptions extends SimulateDataOptions {
  /** Log to stderr so stdout carries only the result (`push --json`). */
  json?: boolean;
  sourceId: string;
  bundlePath?: string;
  flow?: string;
  silent?: boolean;
  verbose?: boolean;
  snapshot?: string;
  /**
   * Web sources only: the absolute URL of the simulated page. Defaults to the
   * input trigger's `options.url` when it is a string, else
   * `http://localhost`.
   */
  pageUrl?: string;
}

export const PAGE_URL_SCOPE_ERROR =
  '--page-url sets the page of a simulated web source; for request context use --ingest.';

const DEFAULT_PAGE_URL = 'http://localhost';

/**
 * The page a simulated web source runs on: an explicit `pageUrl`, else the
 * trigger's `options.url` when it is a string, else `http://localhost`.
 */
function resolvePageUrl(input: unknown, pageUrl: string | undefined): string {
  const url = pageUrl ?? triggerUrl(input) ?? DEFAULT_PAGE_URL;
  let parsed: URL | undefined;
  try {
    parsed = new URL(url);
  } catch {
    parsed = undefined;
  }
  // http(s) only: an opaque origin (file:, about:, data:) has no storage.
  if (parsed?.protocol !== 'http:' && parsed?.protocol !== 'https:')
    throw new Error(
      `--page-url must be an absolute http(s) URL, e.g. https://www.example.com/ (got "${url}")`,
    );
  return parsed.href;
}

function triggerUrl(input: unknown): string | undefined {
  if (!isRecord(input) || !isRecord(input.trigger)) return undefined;
  const { options } = input.trigger;
  return isRecord(options) && isString(options.url) ? options.url : undefined;
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
        json: options.json,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['source.' + options.sourceId],
        silent: options.silent,
        verbose: options.verbose,
        json: options.json,
      };

  const prepared = await prepareFlow(prepareInput);
  // Values of the secrets the flow references: masked in every log line.
  const knownSecrets = collectKnownSecrets(config);

  try {
    const logger = createCLILogger({
      silent: options.silent,
      verbose: options.verbose,
      stderr: options.json,
      knownSecrets,
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

    if (options.pageUrl !== undefined && prepared.platform !== 'web')
      throw new Error(PAGE_URL_SCOPE_ERROR);
    const pageUrl =
      prepared.platform === 'web'
        ? resolvePageUrl(input, options.pageUrl)
        : undefined;

    return await withFlowContext<Simulation.Result>(
      {
        esmPath: prepared.bundlePath,
        platform: prepared.platform,
        logger,
        snapshotCode,
        networkCalls,
        pageUrl,
      },
      async (module) => {
        // Look up createTrigger from the lazy __devExports registry: await the
        // thunk to pull the /dev module in, then narrow without a cast.
        const loadDev = module.__devExports?.[sourceConfig!.package!];
        const devModule =
          typeof loadDev === 'function' ? await loadDev() : undefined;
        const { exportName } = resolveExportName(
          prepared.flowSettings,
          'source',
          options.sourceId,
        );
        const legacyRefusal = legacyExportRefusal(
          devModule,
          module.__packageExports,
          sourceConfig!.package!,
          exportName,
        );
        if (legacyRefusal) throw new Error(legacyRefusal);
        const createTrigger = getCreateTrigger(devModule, exportName);
        if (!createTrigger) {
          throw new Error(
            `Source package "${sourceConfig!.package}" has no createTrigger in /dev export` +
              (exportName ? ` for export ${exportName}` : ''),
          );
        }

        const flowConfig = module.wireConfig(
          options.data ?? module.__configData ?? undefined,
        );
        applyOverrides(flowConfig, prepared.overrides);
        routeFlowLogs(flowConfig, options, knownSecrets);
        const unmockedStores = await applyStoreMockEnvs(
          flowConfig,
          prepared.flowSettings,
          module.__devExports,
        );
        if (unmockedStores.length > 0)
          logger.debug(
            `Stores without a mock env run as configured: ${unmockedStores.join(', ')}`,
          );

        // Only the simulated source starts: another source (the browser
        // source's page view, a CMP) would add events of its own.
        const wiredSources: unknown = flowConfig.sources;
        const wiredSource = isRecord(wiredSources)
          ? wiredSources[options.sourceId]
          : undefined;
        // A copy, so what this run writes to it (env, config) stays here.
        const source: Record<string, unknown> | undefined = isRecord(
          wiredSource,
        )
          ? {
              ...wiredSource,
              ...(isRecord(wiredSource.config)
                ? { config: { ...wiredSource.config } }
                : {}),
            }
          : undefined;
        flowConfig.sources = source ? { [options.sourceId]: source } : {};

        // A source whose package declares simulation calls runs on its mock
        // env (e.g. a queue client), and those calls are recorded like a
        // destination's. Other sources keep the simulated world (the JSDOM
        // page for web sources).
        let trackedCalls: Simulation.Call[] = [];
        const devEnv = getDevEnv(devModule, exportName);
        if (source && devEnv?.push && devEnv.simulation?.length) {
          const { wrappedEnv, calls } = wrapEnv({
            ...devEnv.push,
            simulation: devEnv.simulation,
          });
          source.env = {
            ...(isRecord(source.env) ? source.env : {}),
            ...wrappedEnv,
          };
          trackedCalls = calls;
        }

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
          usage: trackedCalls.length
            ? { [options.sourceId]: trackedCalls }
            : undefined,
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

/**
 * Runs a transformer the way the runtime does: through the one chain runner
 * (`runTransformerChain`), starting at the transformer. Its `before` chain
 * (via `runTransformerBefore` inside the runner), its push and its route all
 * run, resolved hop by hop with `{ ingest, event }`. Returns every finished
 * copy; empty when the event was dropped or stopped.
 */
export async function runTransformerSimulation(
  collector: Collector.Instance,
  transformerId: string,
  event: WalkerOS.DeepPartialEvent,
  ingest: Ingest,
): Promise<WalkerOS.DeepPartialEvent[]> {
  const result = await runTransformerChain(
    collector,
    collector.transformers,
    transformerId,
    event,
    ingest,
    undefined,
    `transformer.${transformerId}`,
  );
  return result.copies.map((copy) => copy.event);
}

/**
 * The ingest a simulated step starts from: the caller's keys, deep-cloned so
 * no nested object is shared between runs, under a fresh runtime `_meta`
 * (a caller-supplied `_meta` never wins).
 */
function simulateIngest(
  stepName: string,
  ingest: Omit<Ingest, '_meta'> | undefined,
): Ingest {
  return {
    ...(ingest ? structuredClone(ingest) : {}),
    _meta: createIngest(stepName)._meta,
  };
}

export interface SimulateTransformerOptions extends SimulateDataOptions {
  /** Log to stderr so stdout carries only the result (`push --json`). */
  json?: boolean;
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
  /** The collector's starting consent, handed to `startFlow` as its state. */
  consent?: WalkerOS.Consent;
}

/**
 * Self-contained transformer simulation.
 *
 * Takes a DeepPartialEvent, validates it with Zod, loads the flow config,
 * bundles it, starts the flow to get initialized transformers, then runs
 * the event from the target transformer on, exactly as the runtime does
 * (`runTransformerSimulation`).
 *
 * Captured array: one entry per finished copy. When the event was dropped
 * or stopped, a single `null` entry.
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
        json: options.json,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['transformer.' + options.transformerId],
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
        json: options.json,
      };

  const prepared = await prepareFlow(prepareInput);
  // Values of the secrets the flow references: masked in every log line.
  const knownSecrets = collectKnownSecrets(config);

  try {
    const logger = createCLILogger({
      silent: options.silent,
      verbose: options.verbose,
      stderr: options.json,
      knownSecrets,
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
        const flowConfig = module.wireConfig(
          options.data ?? module.__configData ?? undefined,
        );
        applyOverrides(flowConfig, prepared.overrides);
        routeFlowLogs(flowConfig, options, knownSecrets);
        const unmockedStores = await applyStoreMockEnvs(
          flowConfig,
          prepared.flowSettings,
          module.__devExports,
        );
        if (unmockedStores.length > 0)
          logger.debug(
            `Stores without a mock env run as configured: ${unmockedStores.join(', ')}`,
          );

        // Don't initialize sources or destinations during transformer simulation.
        if (flowConfig.sources) flowConfig.sources = {};
        if (flowConfig.destinations) flowConfig.destinations = {};
        if (options.consent) flowConfig.consent = options.consent;

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
        const ingest = simulateIngest(options.transformerId, options.ingest);
        // Output events only: each entry is a transformer output, or `null`
        // when the event was dropped. `buildSimulationResult` drops null
        // entries so a drop yields `events: []` and a passthrough yields
        // `events: [<event>]`.
        const captured: Array<{
          event: WalkerOS.DeepPartialEvent | null;
          timestamp: number;
        }> = [];

        logger.info(`Simulating transformer: ${options.transformerId}`);

        // The runtime path: the one chain runner, starting at the
        // transformer (its before chain, its push, its route).
        const outputs = await runTransformerSimulation(
          collector,
          options.transformerId,
          inputEvent,
          ingest,
        );
        if (outputs.length === 0) {
          captured.push({ event: null, timestamp: Date.now() });
        }
        for (const output of outputs) {
          captured.push({ event: output, timestamp: Date.now() });
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

/**
 * Runs the collector step the way the runtime does: the runtime's own
 * enrichment (`enrichEvent`), then the collector's own chain
 * (`collector.next`) through `runCollectorNext`, the function
 * `pushToDestinations` calls. Returns every finished copy (one without a
 * fork, one per surviving fork); empty when the chain dropped the event.
 */
export async function runCollectorSimulation(
  collector: Collector.Instance,
  event: WalkerOS.DeepPartialEvent,
  ingest: Ingest = createIngest('collector'),
): Promise<WalkerOS.Event[]> {
  const enriched = enrichEvent(collector, event);
  const result = await runCollectorNext(collector, enriched, { ingest });
  return result.copies.map((copy) => copy.event);
}

export interface SimulateCollectorOptions extends SimulateDataOptions {
  /** Log to stderr so stdout carries only the result (`push --json`). */
  json?: boolean;
  collectorName: string;
  bundlePath?: string;
  flow?: string;
  /** `collector.next.TRANSFORMER=VALUE` mocks for the collector's chain. */
  mock?: string[];
  silent?: boolean;
  verbose?: boolean;
  snapshot?: string;
  state?: {
    consent?: WalkerOS.Consent;
    user?: WalkerOS.User;
    globals?: WalkerOS.Properties;
    timing?: number; // sets collector.timing, the base from which prepareEvent computes the relative event.timing
  };
  /**
   * Pipeline context the collector's chain (`collector.next`) reads via
   * `ctx.ingest`. Merged onto a fresh ingest so `_meta` is always the
   * runtime's.
   */
  ingest?: Omit<Ingest, '_meta'>;
}

/**
 * Self-contained collector simulation.
 *
 * Takes a post-next `DeepPartialEvent` and an optional collector-state
 * snapshot, then returns what the runtime hands to the destination fan-out:
 * the enriched event after the collector's own chain (`collector.next`), one
 * entry per finished copy, or a single `null` entry when the chain dropped
 * the event. Runs `runCollectorSimulation`; it does not reimplement the
 * enrichment or the chain.
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
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
        json: options.json,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['collector.' + options.collectorName],
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
        json: options.json,
      };

  const prepared = await prepareFlow(prepareInput);
  // Values of the secrets the flow references: masked in every log line.
  const knownSecrets = collectKnownSecrets(config);

  try {
    const logger = createCLILogger({
      silent: options.silent,
      verbose: options.verbose,
      stderr: options.json,
      knownSecrets,
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
        const flowConfig = module.wireConfig(
          options.data ?? module.__configData ?? undefined,
        );
        applyOverrides(flowConfig, prepared.overrides);
        routeFlowLogs(flowConfig, options, knownSecrets);
        const unmockedStores = await applyStoreMockEnvs(
          flowConfig,
          prepared.flowSettings,
          module.__devExports,
        );
        if (unmockedStores.length > 0)
          logger.debug(
            `Stores without a mock env run as configured: ${unmockedStores.join(', ')}`,
          );

        // Don't initialize sources or destinations during collector simulation.
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

        const outputs = await runCollectorSimulation(
          collector,
          event,
          simulateIngest('collector', options.ingest),
        );
        const captured: Array<{
          event: WalkerOS.DeepPartialEvent | null;
          timestamp: number;
        }> =
          outputs.length > 0
            ? outputs.map((output) => ({
                event: output,
                timestamp: Date.now(),
              }))
            : [{ event: null, timestamp: Date.now() }];

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

export interface SimulateDestinationOptions extends SimulateDataOptions {
  /** Log to stderr so stdout carries only the result (`push --json`). */
  json?: boolean;
  destinationId: string;
  bundlePath?: string;
  flow?: string;
  mock?: string[];
  silent?: boolean;
  verbose?: boolean;
  snapshot?: string;
  /**
   * Pipeline context the destination's `before` chain and push read via
   * `ctx.ingest` (e.g. `userAgent` for a conversion API). Merged onto a
   * fresh ingest so `_meta` is always the runtime's.
   */
  ingest?: Omit<Ingest, '_meta'>;
  /**
   * The collector's starting consent: handed to `startFlow` as its initial
   * state, which applies it pre-run as a consent command that only the target
   * (the one registered destination) hears. A `require: ["consent"]`
   * destination starts, the consent gate sees it, and a Consent Mode target
   * records its consent update. The event's own consent still applies.
   */
  consent?: WalkerOS.Consent;
  /**
   * Run `collector.command(command, event)` instead of pushing the event: a
   * step example with `command` (e.g. `consent`), whose `in` is the command's
   * data. With `consent`, the starting state applies first, then the command.
   */
  command?: Flow.StepCommand;
}

/** A consent record: an object of booleans. */
function isConsentRecord(value: unknown): value is WalkerOS.Consent {
  return (
    isRecord(value) &&
    Object.values(value).every((granted) => typeof granted === 'boolean')
  );
}

/** The `require` entries of a pending destination definition. */
function pendingRequire(definition: unknown): string[] {
  if (!isRecord(definition) || !isRecord(definition.config)) return [];
  const { require } = definition.config;
  return isStringArray(require) ? require : [];
}

/**
 * Self-contained destination simulation.
 *
 * Takes a DeepPartialEvent, validates it with Zod, loads the flow config,
 * bundles it, then starts the flow with ONLY the target destination (no
 * other destination initializes against its real env) and `consent` as the
 * collector's starting state. It pushes the event through the full pipeline
 * (consent checks, event mapping, createEvent enrichment, before chains), or
 * runs `command` with the event as its data. When nothing was sent, the
 * result's `skipped` says why, from the collector's own records.
 */
export async function simulateDestination(
  configOrPath: string | Flow.Json,
  event: WalkerOS.DeepPartialEvent | Record<string, unknown>,
  options: SimulateDestinationOptions,
): Promise<Simulation.Result> {
  const startTime = Date.now();

  // Validate event with Zod. A command's data is not an event.
  const parsed = options.command
    ? undefined
    : schemas.PartialEventSchema.safeParse(event);
  if (parsed && !parsed.success) {
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
        json: options.json,
      }
    : {
        mode: 'build' as const,
        config,
        flow: options.flow,
        simulate: ['destination.' + options.destinationId],
        mock: options.mock,
        silent: options.silent,
        verbose: options.verbose,
        json: options.json,
      };

  const prepared = await prepareFlow(prepareInput);
  // Values of the secrets the flow references: masked in every log line.
  const knownSecrets = collectKnownSecrets(config);

  try {
    const logger = createCLILogger({
      silent: options.silent,
      verbose: options.verbose,
      stderr: options.json,
      knownSecrets,
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
        const flowConfig = module.wireConfig(
          options.data ?? module.__configData ?? undefined,
        );

        // Only the target starts: no source, and no other destination, whose
        // init would run against its real env (a vendor script, an SDK
        // client). A missing target fails here, naming the flow's
        // destinations. The target's config is a copy, so what this run
        // writes to it (env, require, overrides) stays in this run.
        const wiredDestinations: unknown = flowConfig.destinations;
        const wiredTarget = isRecord(wiredDestinations)
          ? wiredDestinations[options.destinationId]
          : undefined;
        if (!isRecord(wiredTarget)) {
          const available = isRecord(wiredDestinations)
            ? Object.keys(wiredDestinations).join(', ')
            : '';
          throw new Error(
            `Destination "${options.destinationId}" not found in collector. ` +
              `Available: ${available || 'none'}`,
          );
        }
        const target: Record<string, unknown> = {
          ...wiredTarget,
          config: isRecord(wiredTarget.config) ? { ...wiredTarget.config } : {},
        };
        flowConfig.destinations = { [options.destinationId]: target };
        if (flowConfig.sources) flowConfig.sources = {};
        // The starting consent is initial collector state: startFlow applies
        // it pre-run as a consent command, heard only by the target.
        if (options.consent) flowConfig.consent = options.consent;

        applyOverrides(flowConfig, prepared.overrides);
        routeFlowLogs(flowConfig, options, knownSecrets);
        const unmockedStores = await applyStoreMockEnvs(
          flowConfig,
          prepared.flowSettings,
          module.__devExports,
        );
        if (unmockedStores.length > 0)
          logger.debug(
            `Stores without a mock env run as configured: ${unmockedStores.join(', ')}`,
          );

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
          const { exportName } = resolveExportName(
            prepared.flowSettings,
            'destination',
            options.destinationId,
          );
          const legacyRefusal = legacyExportRefusal(
            devModule,
            module.__packageExports,
            destPkg.package,
            exportName,
          );
          if (legacyRefusal) throw new Error(legacyRefusal);
          const devEnv = getDevEnv(devModule, exportName);

          // Without a mock env the destination would run against its real
          // vendor client. Refuse before startFlow so init never runs.
          if (!devEnv?.push) {
            throw new Error(
              `No mock env for ${destPkg.package} export ${exportName ?? 'default'}: simulate would call the real vendor. Add examples.env.push to the package's dev examples.`,
            );
          }

          const destConfig = target.config;
          if (isRecord(destConfig)) {
            destConfig.env = devEnv.push;
          }

          if (devEnv.simulation?.length) {
            const combined = {
              ...devEnv.push,
              simulation: devEnv.simulation,
            };
            const { wrappedEnv, calls } = wrapEnv(combined);
            if (isRecord(destConfig)) destConfig.env = wrappedEnv;
            trackedCalls = calls;
          }
        }

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

        // Capture the matched mapping rule key from the runtime's own
        // FlowState emissions: the destination push site emits per-event
        // records carrying the mappingKey that processEventMapping computed.
        // Observing the wired execution keeps a single rule-matching
        // authority and automatically reflects injected data payloads.
        let mappingKey: string | undefined;
        const targetStepId = stepId('destination', options.destinationId);
        // The in, out, and error phases can all carry the key, so capture on
        // presence rather than pinning a phase: a throwing destination still
        // reports which rule matched.
        // A failed init or push of the target is recorded as its error
        // phase; the result carries it so the simulation reports failure.
        let stepError: string | undefined;
        // The consent gate's own record of a skipped event: what the
        // destination requires and the collector consent at that hop.
        let consentSkip:
          | { required?: WalkerOS.Consent; consent?: WalkerOS.Consent }
          | undefined;
        let delivered = false;
        const captureMappingKey = (state: FlowState): void => {
          if (state.stepId !== targetStepId) return;
          if (state.mappingKey) mappingKey = state.mappingKey;
          if (state.phase === 'error' && state.error && stepError === undefined)
            stepError = state.error.message;
          if (state.phase === 'out') delivered = true;
          if (state.phase === 'skip' && state.skipReason === 'consent') {
            const required = state.meta?.required;
            consentSkip = {
              ...(isConsentRecord(required) ? { required } : {}),
              ...(state.consent ? { consent: state.consent } : {}),
            };
          }
        };
        // Guarded: a prebuilt bundle may carry a collector without an
        // observer channel; degrade to an undefined key instead of throwing.
        if (collector.observers instanceof Set) {
          collector.observers.add(captureMappingKey);
        }

        if (options.command) {
          // A command example: its calls (e.g. gtag consent update) are the
          // output, recorded as they happen.
          await collector.command(options.command, event);
        } else {
          // Full pipeline: consent, mapping, enrichment, before chains.
          await collector.push(event, {
            include: [options.destinationId],
            ingest: simulateIngest(options.destinationId, options.ingest),
          });
        }

        // Why nothing was sent: still waiting for its require, or skipped
        // at the consent gate (queued with `queue: true`).
        const pending = collector.pending.destinations[options.destinationId];
        let skipped: Simulation.Skipped | undefined;
        if (pending) {
          skipped = { reason: 'pending', require: pendingRequire(pending) };
        } else if (consentSkip && !delivered) {
          const eventConsent =
            'consent' in event && isConsentRecord(event.consent)
              ? event.consent
              : {};
          skipped = {
            reason: 'consent',
            ...(consentSkip.required ? { required: consentSkip.required } : {}),
            granted: { ...consentSkip.consent, ...eventConsent },
          };
        }

        await collector.command('shutdown');

        return buildSimulationResult({
          step: 'destination',
          name: options.destinationId,
          startTime,
          usage: trackedCalls.length
            ? { [options.destinationId]: trackedCalls }
            : undefined,
          mappingKey,
          skipped,
          ...(stepError !== undefined ? { error: stepError } : {}),
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
