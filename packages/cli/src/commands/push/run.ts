import {
  PAGE_URL_SCOPE_ERROR,
  isFlowJson,
  push,
  simulateCollector,
  simulateDestination,
  simulateSource,
  simulateTransformer,
} from './index.js';
import { dispatchSimulate } from './dispatch-simulate.js';
import {
  getErrorMessage,
  isStdinPiped,
  readStdinToTempFile,
  type Platform,
} from '../../core/index.js';
import { loadJsonFromSource, loadJsonConfig } from '../../config/index.js';
import { collectKnownSecrets } from '../../core/known-secrets.js';
import { isObject } from '@walkeros/core';
import type { Flow, Ingest, Simulation, WalkerOS } from '@walkeros/core';
import type { PushCommandOptions, PushResult } from './types.js';

/**
 * Adapt a step `Simulation.Result` into the CLI's `PushResult` envelope. The
 * `walkeros push --simulate` command path formats and exits on a `PushResult`;
 * the programmatic simulate functions return the unified `Simulation.Result`.
 * This boundary keeps the command behavior identical while the functions
 * expose the richer shape to library consumers.
 */
function simulationToPushResult(result: Simulation.Result): PushResult {
  return {
    success: !result.error,
    duration: result.duration,
    ...(result.error ? { error: result.error.message } : {}),
    simulations: [result],
  };
}

const INGEST_SCOPE_ERROR =
  '--ingest applies to transformer, collector and destination simulation only';

const CONSENT_SCOPE_ERROR =
  "--consent sets the collector's starting consent for a simulation; a real push uses the flow's own consent.";

const CONSENT_SHAPE_ERROR = '--consent must be a JSON object of booleans';

const COMMAND_SCOPE_ERROR = '--command applies to destination simulation only.';

function isConsent(value: unknown): value is WalkerOS.Consent {
  return (
    isObject(value) &&
    Object.values(value).every((granted) => typeof granted === 'boolean')
  );
}

/**
 * Resolve the collector's starting consent: the raw `--consent` source (JSON
 * string, file path or URL) wins over a programmatic `consent`.
 */
async function resolveConsent(
  options: PushCommandOptions,
): Promise<WalkerOS.Consent | undefined> {
  if (options.consentSource === undefined) return options.consent;
  const loaded: unknown = await loadJsonFromSource(options.consentSource, {
    name: 'consent',
  });
  if (!isConsent(loaded)) throw new Error(CONSENT_SHAPE_ERROR);
  return loaded;
}

/**
 * The config a run reads, loaded ONCE: a flow config is handed on as the
 * object (simulate) or as `raw` (real push), so a URL is fetched once and the
 * secrets masked are those of the flow that runs. Anything else (a prebuilt
 * bundle, an unreadable path) keeps the path for the step to read and
 * report.
 */
async function loadFlowJson(config: string): Promise<Flow.Json | undefined> {
  try {
    const loaded: unknown = await loadJsonConfig(config);
    return isFlowJson(loaded) ? loaded : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the pipeline context a simulated step reads: the raw `--ingest`
 * source (JSON string, file path or URL) wins over a programmatic `ingest`.
 */
async function resolveIngest(
  options: PushCommandOptions,
): Promise<Omit<Ingest, '_meta'> | undefined> {
  if (options.ingestSource === undefined) return options.ingest;
  const loaded: unknown = await loadJsonFromSource(options.ingestSource, {
    name: 'ingest',
  });
  if (!isObject(loaded)) throw new Error('--ingest must be a JSON object');
  return loaded;
}

/**
 * Pure variant of `pushCommand` — produces a `PushResult` and never calls
 * `process.exit` or writes to stdout. The CLI wrapper in `index.ts` adds
 * formatting and exit codes on top.
 *
 * Validates `--simulate` flags upfront via `dispatchSimulate` so a malformed
 * flag fails fast (no wasted bundle). Routes to the correct typed function:
 * - `none` → `push()`
 * - `source` → `simulateSource()` (single id; multi rejected by dispatcher)
 * - `transformer` → `simulateTransformer()` (single id)
 * - `destination` → `runDestinationSimulationLoop()` (multi-target loop)
 */
export async function runPushCommand(
  options: PushCommandOptions,
): Promise<PushResult> {
  return (await runPushCommandWithSecrets(options)).result;
}

/**
 * `runPushCommand`, plus the values of the secrets the flow config references
 * (see `collectKnownSecrets`), so `pushCommand` can mask them in its output.
 */
export async function runPushCommandWithSecrets(
  options: PushCommandOptions,
): Promise<{ result: PushResult; knownSecrets: string[] }> {
  const loaded: { knownSecrets: string[] } = { knownSecrets: [] };
  const result = await runPush(options, loaded);
  return { result, knownSecrets: loaded.knownSecrets };
}

async function runPush(
  options: PushCommandOptions,
  loaded: { knownSecrets: string[] },
): Promise<PushResult> {
  const startTime = Date.now();

  try {
    // 1. Validate --simulate flags FIRST. Fail fast before bundling/IO.
    const plan = dispatchSimulate(options.simulate ?? []);

    // 2. Resolve config: stdin > argument > default (preserves prior behavior).
    let configPath: string;
    if (isStdinPiped() && !options.config) {
      configPath = await readStdinToTempFile('push');
    } else {
      configPath = options.config || 'bundle.config.json';
    }
    const flowJson = await loadFlowJson(configPath);
    const config: string | Flow.Json = flowJson ?? configPath;
    const knownSecrets = flowJson ? collectKnownSecrets(flowJson) : [];
    loaded.knownSecrets = knownSecrets;

    // 3. Resolve string event inputs (path/URL → JSON).
    let resolvedEvent: unknown = options.event;
    if (typeof options.event === 'string') {
      resolvedEvent = await loadJsonFromSource(options.event, {
        name: 'event',
      });
    }

    // 4. Resolve --ingest. Only a simulated transformer, collector or
    // destination has a pipeline context to seed.
    const ingest = await resolveIngest(options);
    if (ingest && (plan.kind === 'none' || plan.kind === 'source'))
      throw new Error(INGEST_SCOPE_ERROR);

    // 5. Scope checks of the other simulate flags, then --consent: the
    // collector's starting state of a simulation (for a source, the state its
    // trigger's flow starts from). A real push runs the flow's own consent.
    if (options.command !== undefined && plan.kind !== 'destination')
      throw new Error(COMMAND_SCOPE_ERROR);
    if (options.pageUrl !== undefined && plan.kind !== 'source')
      throw new Error(PAGE_URL_SCOPE_ERROR);
    const consent = await resolveConsent(options);
    if (consent && plan.kind === 'none') throw new Error(CONSENT_SCOPE_ERROR);

    // 6. Route to the correct typed function based on the plan.
    let result: PushResult;
    switch (plan.kind) {
      case 'none':
        result = await push(configPath, resolvedEvent, {
          raw: flowJson,
          knownSecrets,
          flow: options.flow,
          json: options.json,
          verbose: options.verbose,
          silent: options.silent,
          platform: options.platform as Platform | undefined,
          mock: options.mock,
          snapshot: options.snapshot,
        });
        break;

      case 'source':
        result = simulationToPushResult(
          await simulateSource(config, resolvedEvent, {
            sourceId: plan.ids[0],
            flow: options.flow,
            pageUrl: options.pageUrl,
            consent,
            silent: options.silent,
            verbose: options.verbose,
            json: options.json,
            snapshot: options.snapshot,
          }),
        );
        break;

      case 'transformer':
        result = simulationToPushResult(
          await simulateTransformer(
            config,
            resolvedEvent as WalkerOS.DeepPartialEvent,
            {
              transformerId: plan.ids[0],
              flow: options.flow,
              mock: options.mock,
              ingest,
              consent,
              silent: options.silent,
              verbose: options.verbose,
              json: options.json,
              snapshot: options.snapshot,
            },
          ),
        );
        break;

      case 'collector':
        result = simulationToPushResult(
          await simulateCollector(
            config,
            resolvedEvent as WalkerOS.DeepPartialEvent,
            {
              collectorName: plan.ids[0],
              flow: options.flow,
              mock: options.mock,
              ingest,
              state: consent ? { consent } : undefined,
              silent: options.silent,
              verbose: options.verbose,
              json: options.json,
              snapshot: options.snapshot,
            },
          ),
        );
        break;

      case 'destination':
        result = await runDestinationSimulationLoop(
          config,
          resolvedEvent as WalkerOS.DeepPartialEvent,
          plan.ids,
          options,
          ingest,
          consent,
        );
        break;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Run `simulateDestination` once per destination id and aggregate into a
 * single `PushResult` that keeps every per-destination result. Stops on the
 * first failure and returns a structured error referencing the failed id.
 */
async function runDestinationSimulationLoop(
  config: string | Flow.Json,
  event: WalkerOS.DeepPartialEvent,
  destinationIds: string[],
  options: PushCommandOptions,
  ingest: Omit<Ingest, '_meta'> | undefined,
  consent: WalkerOS.Consent | undefined,
): Promise<PushResult> {
  const startTime = Date.now();
  const simulations: Simulation.Result[] = [];

  for (const destinationId of destinationIds) {
    const r = await simulateDestination(config, event, {
      destinationId,
      flow: options.flow,
      mock: options.mock,
      ingest,
      consent,
      command: options.command,
      silent: options.silent,
      verbose: options.verbose,
      json: options.json,
      snapshot: options.snapshot,
    });
    simulations.push(r);
    if (r.error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: `simulate destination.${destinationId}: ${r.error.message}`,
        simulations,
      };
    }
  }

  return {
    success: true,
    duration: Date.now() - startTime,
    simulations,
  };
}
