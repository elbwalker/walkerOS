import type { Logger } from '@walkeros/core';
import { ENV_MARKER_PREFIX } from '@walkeros/core';
import { loadFlowConfig } from '../../config/loader.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { createSuccessOutput, writeResult } from '../../core/output.js';
import { resolveExportName } from '../../core/resolve-export-name.js';
import { resolveComponent } from './resolve.js';

export interface SetupCommandOptions {
  target: string;
  config?: string;
  flow?: string;
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
  /**
   * Inject a logger for tests. Defaults to a CLI logger derived from
   * verbose/silent/json. Production callers should not pass this.
   */
  logger?: Logger.Instance;
}

/**
 * Narrow shape of `config.setup` we care about: a boolean flag or any object
 * carrying setup options. Mirrors the typed `setup?: boolean | SetupOptions<T>`
 * field on Destination/Source/Store config.
 */
type SetupConfigValue = boolean | object | undefined;

/**
 * Read the `setup` field off a component's opaque `config` payload without
 * resorting to `as` casts. Anything that isn't a config-shaped object yields
 * `undefined`, which the caller treats as "no setup requested".
 */
function readSetupField(config: unknown): SetupConfigValue {
  if (config === null || typeof config !== 'object') return undefined;
  // `'setup' in config` narrows `config` to `{ setup: unknown }` in TS,
  // letting us read the field directly without a cast.
  if (!('setup' in config)) return undefined;
  const value: unknown = config.setup;
  if (typeof value === 'boolean') return value;
  if (value !== null && typeof value === 'object') return value;
  return undefined;
}

/**
 * Type guard for the minimal shape of a walkerOS component's default export:
 * an object that may carry init/setup/destroy lifecycle functions. Each is
 * optional and validated separately by `isLifecycleFn` before being called.
 */
interface ComponentDefault {
  init?: unknown;
  setup?: unknown;
  destroy?: unknown;
}

function isComponentDefault(value: unknown): value is ComponentDefault {
  return value !== null && typeof value === 'object';
}

/**
 * Type guard for any lifecycle function (init/setup/destroy). All three
 * accept a single context argument and return a value or promise; the
 * callers narrow the result they care about (e.g., init returning a
 * Config, void, or false).
 */
function isLifecycleFn(
  value: unknown,
): value is (input: unknown) => unknown | Promise<unknown> {
  return typeof value === 'function';
}

/**
 * Resolve deferred `$env` markers (`__WALKEROS_ENV:NAME[:default]`) against
 * the live `process.env`. Server flows are loaded with
 * `getFlowSettings({ deferred: true })` so the bundler can rewrite markers
 * into raw `process.env[...]` expressions in the generated code. The setup
 * command does NOT bundle: it imports the destination's package and calls
 * its lifecycle directly in this Node process, so markers must be replaced
 * with their actual values here. Without this step a destination's
 * `init` sees the literal string `__WALKEROS_ENV:PUBSUB_SA_JSON` and
 * fails to parse it as JSON.
 *
 * Mirrors the resolution semantics in `core/flow.ts` (REF_ENV branch):
 * lookup `process.env[NAME]`; fall back to the inline default if present;
 * otherwise leave the marker in place so the package's own validation
 * surfaces a precise error.
 */
function resolveEnvMarkers<T>(value: T): T {
  if (typeof value === 'string') {
    return resolveEnvMarkersInString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveEnvMarkers(v)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveEnvMarkers(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Replace every `__WALKEROS_ENV:NAME[:default]` marker in `input` with the
 * corresponding `process.env` value. The marker grammar matches the one
 * the bundler scans for (see `bundler.ts`); a marker continues until the
 * next marker prefix or until whitespace/quote, so two markers in one
 * string resolve independently. Returns the input unchanged when no
 * marker is present.
 */
function resolveEnvMarkersInString(input: string): string {
  if (!input.includes(ENV_MARKER_PREFIX)) return input;
  const esc = ENV_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    esc + '([a-zA-Z_][a-zA-Z0-9_]*)' + '(?::((?:(?!' + esc + ')[^\\s"\'])*))?',
    'g',
  );
  return input.replace(re, (match, name: string, defaultValue?: string) => {
    if (typeof process !== 'undefined' && process.env?.[name] !== undefined) {
      return process.env[name]!;
    }
    if (defaultValue !== undefined) return defaultValue;
    return match; // leave unresolved; package validation will surface it
  });
}

/**
 * Result of awaiting `code.init`. Mirrors the union returned by
 * destination/source/store init implementations, narrowed for the CLI.
 */
type InitOutcome =
  | { kind: 'config'; config: unknown }
  | { kind: 'void' }
  | { kind: 'aborted' };

/**
 * Classify the value returned by a destination/source/store `init`
 * implementation:
 *   - `false` → explicit abort, do NOT call setup
 *   - object  → resolved Config, use it as the source of truth for setup
 *               and destroy contexts
 *   - void/undefined → init mutated the input config in place (legal but
 *                       rare); fall through to the original config
 *
 * Mirrors the handling in collector/src/destination.ts:534-540, where
 * `configResult === false` short-circuits and an object replaces the
 * config while undefined keeps the existing one.
 */
function classifyInitResult(value: unknown): InitOutcome {
  if (value === false) return { kind: 'aborted' };
  if (value !== null && typeof value === 'object') {
    return { kind: 'config', config: value };
  }
  return { kind: 'void' };
}

export async function setupCommand(opts: SetupCommandOptions): Promise<void> {
  const startTime = Date.now();

  // Build the framework logger up-front so every narration line, including
  // the skip paths, honors --silent / --json. The package's own logger
  // output appears between the "starting" and "ok" lines.
  const baseLogger =
    opts.logger ??
    createCLILogger({
      verbose: opts.verbose,
      silent: opts.silent,
      json: opts.json,
    });

  const { flowSettings } = await loadFlowConfig(opts.config ?? './flow.json', {
    flowName: opts.flow,
  });

  const component = resolveComponent(flowSettings, opts.target);
  const scoped = baseLogger.scope(component.kind).scope(component.id);

  scoped.info(`setup: starting ${component.kind}.${component.id}`);

  // Mirror bundle's resolution so multi-export packages (e.g. gcp exporting
  // both destinationBigQuery and destinationPubSub) route to the right
  // export instead of always grabbing the package default.
  const { exportName, source: resolveSource } = resolveExportName(
    flowSettings,
    component.kind,
    component.id,
  );

  const mod: Record<string, unknown> = await import(component.packageName);
  const pickedExport: unknown =
    exportName !== undefined ? mod[exportName] : mod.default;

  if (!isComponentDefault(pickedExport)) {
    if (exportName !== undefined) {
      const origin =
        resolveSource === 'import'
          ? `${component.kind}.${component.id}.import`
          : `bundle.packages["${component.packageName}"].imports[0]`;
      throw new Error(
        `Package ${component.packageName} has no export "${exportName}" ` +
          `(referenced by ${origin}).`,
      );
    }
    throw new Error(
      `Package ${component.packageName} has no default export. ` +
        `walkerOS components are expected to use 'export default'.`,
    );
  }

  const initFn = pickedExport.init;
  const setupFn = pickedExport.setup;
  const destroyFn = pickedExport.destroy;

  const emitSkipEnvelope = async (reason: string): Promise<void> => {
    if (!opts.json) return;
    const envelope = createSuccessOutput(
      {
        kind: component.kind,
        id: component.id,
        status: 'skipped',
        reason,
      },
      Date.now() - startTime,
    );
    await writeResult(JSON.stringify(envelope, null, 2) + '\n', {});
  };

  if (!isLifecycleFn(setupFn)) {
    // No setup defined on the package, narrate explicitly, exit ok.
    scoped.info(
      `setup: skipped ${component.kind}.${component.id} (no setup function)`,
    );
    await emitSkipEnvelope('no setup function');
    return;
  }

  // Honor config.setup explicitly. If user wrote `setup: false`, narrate and skip.
  // (Omitted setup is also falsy and gets the same skip message.)
  const setupConfig = readSetupField(component.config);
  if (setupConfig === false || setupConfig === undefined) {
    const reason = setupConfig === false ? 'false' : 'unset';
    scoped.info(
      `setup: skipped ${component.kind}.${component.id} (config.setup is ${reason})`,
    );
    await emitSkipEnvelope(`config.setup is ${reason}`);
    return;
  }

  // Server flows are loaded in deferred mode so the bundler can rewrite
  // `$env.NAME` markers into `process.env[NAME]` expressions. The setup
  // command imports the package and runs its lifecycle directly in this
  // Node process, so markers must be replaced with their actual values
  // here. Web flows are already eagerly resolved by `loadBundleConfig`,
  // so this is a no-op for them.
  const resolvedInputConfig = resolveEnvMarkers(component.config);
  const resolvedEnv = resolveEnvMarkers(component.env);

  // Run the package's lifecycle in proper order: init → setup → destroy.
  //
  // Many destinations rely on `init` to: parse `$env`-injected JSON
  // strings (e.g. service-account credentials), construct an SDK client,
  // and validate required settings. Calling `setup` directly skips that
  // preparation and forces setup to re-implement client construction
  // from raw, unparsed config — which is what previously caused
  // `walkeros setup destination.pubsub` to fail with "Could not load the
  // default credentials". Mirroring the collector's behavior (see
  // collector/src/destination.ts:526-540) keeps both invocation paths
  // honest about what the package promises.
  //
  // The init result is classified the same way the collector does:
  //   - object → use as resolved config for setup + destroy
  //   - void   → init mutated the input config in place; reuse it
  //   - false  → init explicitly aborted; do NOT run setup
  let resolvedConfig: unknown = resolvedInputConfig;
  if (isLifecycleFn(initFn)) {
    const initResult = await initFn({
      id: component.id,
      config: resolvedInputConfig,
      env: resolvedEnv,
      logger: scoped,
    });
    const outcome = classifyInitResult(initResult);
    if (outcome.kind === 'aborted') {
      scoped.info(
        `setup: skipped ${component.kind}.${component.id} (init returned false)`,
      );
      await emitSkipEnvelope('init returned false');
      return;
    }
    if (outcome.kind === 'config') {
      resolvedConfig = outcome.config;
    }
  }

  const result = await setupFn({
    id: component.id,
    config: resolvedConfig,
    env: resolvedEnv,
    logger: scoped,
  });

  // Always run `destroy` after setup if the package provides one, so that
  // SDK clients constructed in `init` (e.g. PubSub `client.close()`,
  // BigQuery `writeClient.close()`) release sockets and timers cleanly
  // before the CLI exits. We log destroy failures but never let them
  // mask a successful setup result.
  if (isLifecycleFn(destroyFn)) {
    try {
      await destroyFn({
        id: component.id,
        config: resolvedConfig,
        env: resolvedEnv,
        logger: scoped,
      });
    } catch (err) {
      scoped.warn(`setup: destroy failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // In --json mode, emit the standard envelope so this command matches the
  // rest of the CLI (createSuccessOutput → writeResult). In human mode we
  // skip the raw JSON dump entirely; sibling commands narrate, they don't
  // splice JSON between lines.
  if (opts.json) {
    const envelope = createSuccessOutput(
      { result: result ?? null },
      Date.now() - startTime,
    );
    await writeResult(JSON.stringify(envelope, null, 2) + '\n', {});
    return;
  }

  scoped.info(`setup: ok ${component.kind}.${component.id}`);
}
