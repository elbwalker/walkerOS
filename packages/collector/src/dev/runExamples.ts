import type {
  Collector,
  Destination,
  Elb,
  Flow,
  Logger,
  Mapping,
  StandardEventName,
  Source,
  Store,
  Transformer,
  Trigger,
  WalkerOS,
} from '@walkeros/core';
import {
  createIngest,
  getEvent,
  isObject,
  isStoreValue,
  StepError,
} from '@walkeros/core';
import { startFlow } from '../flow';
import { wrapEnv } from '../wrapEnv';
import type { Answer, Boundary, EnvAnswer, EnvBoundary } from './boundary';
import { answerEnv, installBoundary } from './boundary';

/**
 * The typed step-example runner: every example runs through a real collector
 * (`startFlow`), mocked only at the boundary (the package's examples env, or
 * the kit's fetch boundary), and its `out` and `outcome` are compared with
 * what the step did. One implementation with a thin binding per step kind.
 */

/** The id every run registers its step under. */
export const STEP_ID = 'step';

/** The run phase a boundary records: requests made by `init` are `init`. */
type Phase = 'init' | 'push';

export interface LogLine {
  level: Logger.Level;
  message: string;
  context: Logger.LogContext;
  scope: string[];
}

/** The package's examples env (`examples.env`): the mocks and their paths. */
export interface ExamplesEnv {
  push: Record<string, unknown>;
  simulation: string[];
}

/** `examples.env` read as mocks plus paths; a bare mock object has no paths. */
export function readEnv(
  env: Record<string, unknown> | undefined,
): ExamplesEnv | undefined {
  if (!env) return undefined;
  const push = isObject(env.push) ? env.push : env;
  const simulation = Array.isArray(env.simulation)
    ? env.simulation.filter((path): path is string => typeof path === 'string')
    : [];
  return { push, simulation };
}

/** What one input is: an event to push or a walker command. */
export interface Input {
  event?: WalkerOS.DeepPartialEvent;
  command?: Flow.StepCommand;
  data?: unknown;
  ingest?: Record<string, unknown>;
}

export function isEvent(value: unknown): value is WalkerOS.DeepPartialEvent {
  return isObject(value) && typeof value.name === 'string';
}

function isRule(value: unknown): value is Mapping.Rule {
  return isObject(value);
}

/** The input an example describes, or a problem with it. */
export function inputOf(example: Flow.StepExample): Input | string {
  if (example.command) return { command: example.command, data: example.in };
  if (isEvent(example.in)) return { event: example.in };
  return 'its in is neither an event (an object with a name) nor a command';
}

/** Entity and action of an event name. */
function keysOf(event: WalkerOS.DeepPartialEvent): [string, string] {
  const [entity = '', action = ''] = (event.name ?? '').split(' ');
  return [event.entity ?? entity, event.action ?? action];
}

/**
 * R2: an example's own rule, as the destination's mapping for its event;
 * without one the destination's configured mapping applies.
 */
export function mappingOf(
  example: Flow.StepExample,
  input: Input,
): Mapping.Rules | undefined {
  if (!input.event || !isRule(example.mapping)) return undefined;
  const [entity, action] = keysOf(input.event);
  return { [entity]: { [action]: example.mapping } };
}

/** How the boundary answers an example's `respond`. */
export function answerOf(respond?: Flow.StepRespond): Answer {
  if (!respond) return {};
  return { status: respond.status, body: respond.body, error: respond.error };
}

/** The SDK boundary's answer to an example's `respond`. */
export function envAnswerOf(respond?: Flow.StepRespond): EnvAnswer {
  if (!respond) return { kind: 'pass' };
  if (respond.error === 'timeout') return { kind: 'hang' };
  if (respond.error === 'network')
    return { kind: 'reject', error: new Error('Network error') };
  if (respond.status !== undefined && respond.status >= 400)
    return {
      kind: 'reject',
      error: new StepError(`HTTP ${respond.status}`, {
        code: 'transport',
        status: respond.status,
        body: respond.body,
      }),
    };
  return { kind: 'pass' };
}

/** Timeout of runs that wait for a collector timeout (ms). */
export const RUN_TIMEOUT = 1000;

/** Whether the test runs on fake timers (jest's modern or legacy fakes). */
export function timersAreFake(): boolean {
  return '_isMockFunction' in setTimeout || 'clock' in setTimeout;
}

/** Setup of one run: what the step gets and what the boundaries answer. */
export interface Setup {
  settings?: unknown;
  /** Extra step config (mapping, batch, timeout, consent, loadScript). */
  config?: Record<string, unknown>;
  /** Examples env; without it the step runs on its own env, at the boundary. */
  env?: ExamplesEnv;
  answers?: (index: number) => Answer;
  envAnswers?: (index: number) => EnvAnswer;
  /** Records every settings key the step reads (kit item 6). */
  reads?: Set<string>;
  /** Receives what init threw (kit item 4). */
  initError?: (error: unknown) => void;
}

/** One input's run: its result and what happened at the boundaries. */
export interface Step {
  result: Elb.PushResult;
  effects: Flow.StepEffect[];
  logs: LogLine[];
  /** Requests or SDK calls still unanswered when the push settled. */
  pending: number;
}

/** A started flow with one step and the boundaries around it. */
export interface Session {
  collector: Collector.Instance;
  logs: LogLine[];
  boundary: Boundary;
  envBoundary?: EnvBoundary;
  /** Requests and SDK calls made while the step initialized. */
  initCalls(): number;
  /** Scripts added to the document (web), with and without the marker. */
  scripts(): { marked: number; unmarked: number };
  run(input: Input): Promise<Step>;
  close(): Promise<void>;
}

/** Keys a read of settings may touch without being a setting. */
const IGNORED_READS = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  'toJSON',
  'then',
  '$$typeof',
  'asymmetricMatch',
  'nodeType',
  'tagName',
]);

/** Settings as a Proxy that records every key read, else as given. */
function settingsOf(setup: Setup): unknown {
  const { settings, reads } = setup;
  if (!reads || !isObject(settings)) return settings;
  const record = (key: string | symbol) => {
    if (typeof key === 'string' && !IGNORED_READS.has(key)) reads.add(key);
  };
  return new Proxy(settings, {
    get(target, key, receiver) {
      record(key);
      return Reflect.get(target, key, receiver);
    },
    has(target, key) {
      record(key);
      return Reflect.has(target, key);
    },
  });
}

/**
 * The marker web-core's `loadVendor` sets on every script it injects (its
 * `VENDOR_SCRIPT_MARKER`; the collector does not depend on web-core). A
 * drift fails the vendor-global item 1 of every adopting destination.
 */
export const VENDOR_SCRIPT_MARKER = 'data-walkeros-vendor';

function documentScripts(): Element[] {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll('script'));
}

/** Runs `fn` as the init phase; its errors go to `initError`. */
async function inInit<R>(
  setPhase: (phase: Phase) => void,
  setup: Setup,
  fn: () => R | Promise<R>,
): Promise<R> {
  setPhase('init');
  try {
    return await fn();
  } catch (error) {
    setup.initError?.(error);
    throw error;
  } finally {
    setPhase('push');
  }
}

/** Open a session: install the boundaries, start the flow `bind` describes. */
async function open(
  setup: Setup,
  bind: (
    setPhase: (phase: Phase) => void,
    env: Record<string, unknown> | undefined,
  ) => Collector.InitConfig,
  effectsOf?: () => Flow.StepEffect[],
): Promise<Session> {
  const logs: LogLine[] = [];
  const boundary = installBoundary(setup.answers);
  const before = new Set(documentScripts());

  let envBoundary: EnvBoundary | undefined;
  let env: Record<string, unknown> | undefined;
  let recorded: Array<{ fn: string; args: unknown[] }> = [];
  if (setup.env) {
    envBoundary = answerEnv(
      setup.env.push,
      setup.env.simulation,
      setup.envAnswers,
    );
    if (setup.env.simulation.length) {
      const wrapped = wrapEnv({
        ...envBoundary.env,
        simulation: setup.env.simulation,
      });
      env = wrapped.wrappedEnv;
      recorded = wrapped.calls;
    } else env = envBoundary.env;
  }

  // Calls recorded while the step initializes belong to the init phase:
  // item 5 reads them there, and no example's effects ever include them.
  const initRecorded = new Set<number>();
  let initFrom: number | undefined;
  const setPhase = (phase: Phase) => {
    boundary.phase = phase;
    if (envBoundary) envBoundary.phase = phase;
    if (phase === 'init') initFrom = recorded.length;
    else if (initFrom !== undefined) {
      for (let index = initFrom; index < recorded.length; index++)
        initRecorded.add(index);
      initFrom = undefined;
    }
  };

  const handler: Logger.Handler = (level, message, context, scope) => {
    logs.push({ level, message, context, scope });
  };
  const config = bind(setPhase, env);

  let collector: Collector.Instance;
  try {
    ({ collector } = await startFlow({
      ...config,
      logger: { level: 'DEBUG', handler },
    }));
  } catch (error) {
    boundary.restore();
    throw error;
  }

  /** What the step did for its inputs: never what its init did. */
  const effects = (): Flow.StepEffect[] => {
    if (effectsOf) return effectsOf();
    if (setup.env)
      return recorded.flatMap(({ fn, args }, index) => {
        if (initRecorded.has(index)) return [];
        const effect: Flow.StepEffect = [fn, ...args];
        return [effect];
      });
    return boundary.requests
      .filter((request) => request.phase !== 'init')
      .map((request) => request.effect);
  };

  return {
    collector,
    logs,
    boundary,
    envBoundary,
    initCalls: () =>
      boundary.requests.filter((request) => request.phase === 'init').length +
      (envBoundary?.calls.filter((call) => call.phase === 'init').length ?? 0),
    scripts: () => {
      const added = documentScripts().filter((script) => !before.has(script));
      const marked = added.filter((script) =>
        script.hasAttribute(VENDOR_SCRIPT_MARKER),
      ).length;
      return { marked, unmarked: added.length - marked };
    },
    run: async (input) => {
      const effectsBefore = effects().length;
      const logsBefore = logs.length;
      const result = input.command
        ? await collector.command(input.command, input.data)
        : await collector.push(
            input.event ?? {},
            input.ingest
              ? { ingest: { ...createIngest('kit'), ...input.ingest } }
              : undefined,
          );
      return {
        result,
        effects: effects().slice(effectsBefore),
        logs: logs.slice(logsBefore),
        pending: boundary.pending() + (envBoundary?.pending() ?? 0),
      };
    },
    close: async () => {
      try {
        await collector.command('shutdown');
      } finally {
        boundary.restore();
        // The page is loadVendor's once-per-src registry: the scripts this
        // run added go, so the next run starts on the page it found.
        documentScripts()
          .filter((script) => !before.has(script))
          .forEach((script) => script.remove());
      }
    },
  };
}

/** A destination with its init run in the init phase. */
function instrumentDestination(
  step: Destination.Instance<Destination.TypesGeneric>,
  setPhase: (phase: Phase) => void,
  setup: Setup,
): Destination.Instance<Destination.TypesGeneric> {
  const init = step.init;
  if (!init) return step;
  return {
    ...step,
    init: (context) => inInit(setPhase, setup, () => init.call(step, context)),
  };
}

export function openDestination(
  step: Destination.Instance<Destination.TypesGeneric>,
  setup: Setup,
): Promise<Session> {
  return open(setup, (setPhase, env) => ({
    destinations: {
      [STEP_ID]: {
        code: instrumentDestination(step, setPhase, setup),
        config: {
          ...setup.config,
          ...(setup.settings !== undefined
            ? { settings: settingsOf(setup) }
            : {}),
          ...(env ? { env } : {}),
        },
      },
    },
  }));
}

/** What a destination's `before` chain delivered: the transformer's effects. */
export function openTransformer(
  step: Transformer.Init<Transformer.TypesGeneric>,
  setup: Setup,
): Promise<Session> {
  const delivered: Flow.StepEffect[] = [];
  const capture: Destination.Instance = {
    type: 'capture',
    config: {},
    push: (event) => {
      delivered.push(['return', { event }]);
    },
  };
  return open(
    setup,
    (setPhase, env) => {
      const code: Transformer.Init<Transformer.TypesGeneric> = (context) =>
        inInit(setPhase, setup, async () => {
          const instance = await step(context);
          const init = instance.init;
          if (!init) return instance;
          return {
            ...instance,
            init: (initContext) =>
              inInit(setPhase, setup, () => init.call(instance, initContext)),
          };
        });
      return {
        transformers: {
          [STEP_ID]: {
            code,
            config: {
              ...setup.config,
              ...(setup.settings !== undefined
                ? { settings: settingsOf(setup) }
                : {}),
            },
            // Where a flow's transformer entry carries it: the factory gets
            // it as context.env, init and push through the config it returns.
            ...(env ? { env } : {}),
          },
        },
        // Under the step's id too, so its failure reads like a destination's.
        destinations: { [STEP_ID]: { code: capture, before: STEP_ID } },
      };
    },
    () => delivered,
  );
}

/** A store's operations on the collector's own instance. */
export function openStore(
  step: Store.Init<Store.TypesGeneric>,
  setup: Setup,
): Promise<Session> {
  return open(setup, (setPhase, env) => ({
    stores: {
      [STEP_ID]: {
        code: (context) => inInit(setPhase, setup, () => step(context)),
        config: {
          ...setup.config,
          ...(setup.settings !== undefined
            ? { settings: settingsOf(setup) }
            : {}),
        },
        // Where a flow's store entry carries it: the store's context.env.
        ...(env ? { env } : {}),
      },
    },
  }));
}

/** A source started in the init phase; its events stop at the collector. */
export function openSource(
  step: Source.Init<Source.TypesGeneric>,
  setup: Setup,
): Promise<Session> {
  return open(setup, (setPhase, env) => ({
    sources: {
      [STEP_ID]: {
        code: (context) => inInit(setPhase, setup, () => step(context)),
        config: {
          ...setup.config,
          ...(setup.settings !== undefined
            ? { settings: settingsOf(setup) }
            : {}),
        },
        ...(env ? { env } : {}),
      },
    },
  }));
}

/** A store operation an example describes. */
export interface StoreOperation {
  operation: 'get' | 'set' | 'delete';
  key: string;
  value?: unknown;
}

export function isStoreOperation(value: unknown): value is StoreOperation {
  return (
    isObject(value) &&
    typeof value.key === 'string' &&
    (value.operation === 'get' ||
      value.operation === 'set' ||
      value.operation === 'delete')
  );
}

/** Run one store operation; its effect is the operation and its result. */
export async function runStoreOperation(
  session: Session,
  operation: StoreOperation,
): Promise<Flow.StepEffect> {
  const store = session.collector.stores[STEP_ID];
  if (!store) throw new Error('The store did not start');
  if (operation.operation === 'get')
    return ['get', operation.key, await store.get(operation.key)];
  if (operation.operation === 'set') {
    if (!isStoreValue(operation.value))
      throw new Error(`The value to set ${operation.key} is not a store value`);
    await store.set(operation.key, operation.value);
    return ['set', operation.key, operation.value];
  }
  await store.delete(operation.key);
  return ['delete', operation.key];
}

/** Structural equality; a key whose value is undefined counts as absent. */
export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    return a.every((value, index) => isEqual(value, b[index]));
  }
  if (isObject(a) && isObject(b)) {
    const keysOfA = Object.keys(a).filter((key) => a[key] !== undefined);
    const keysOfB = Object.keys(b).filter((key) => b[key] !== undefined);
    if (keysOfA.length !== keysOfB.length) return false;
    return keysOfA.every((key) => isEqual(a[key], b[key]));
  }
  return false;
}

/** A value as short readable text for a problem message. */
export function show(value: unknown): string {
  let text: string;
  try {
    text =
      JSON.stringify(value, (_, inner: unknown) =>
        inner === undefined ? 'undefined' : inner,
      ) ?? String(value);
  } catch {
    text = String(value);
  }
  return text.length > 400 ? `${text.slice(0, 400)}...` : text;
}

/** The outcome a result reports for the step. */
export function outcomeOf(
  result: Elb.PushResult,
): Flow.StepOutcome | undefined {
  const failed = result.failed?.[STEP_ID]?.reason;
  if (failed)
    return 'retryable' in failed
      ? { status: 'failed', code: failed.code, retryable: failed.retryable }
      : { status: 'failed', code: failed.code };
  const queued = result.queued?.[STEP_ID]?.reason;
  if (queued) return { status: 'queued', code: queued.code };
  if (!result.ok && result.reason)
    return {
      status: 'failed',
      code: result.reason.code,
      retryable: result.reason.retryable,
    };
  return undefined;
}

/** Problems of an outcome against the example's declared one. */
export function compareOutcome(
  actual: Flow.StepOutcome | undefined,
  expected: Flow.StepOutcome | undefined,
): string | undefined {
  if (!expected) {
    if (actual?.status === 'failed')
      return `failed with ${actual.code} but declares no outcome`;
    return undefined;
  }
  if (!actual) return `expected ${expected.status} ${expected.code}, got none`;
  if (actual.status !== expected.status || actual.code !== expected.code)
    return `expected ${expected.status} ${expected.code}, got ${actual.status} ${actual.code}`;
  if (
    expected.retryable !== undefined &&
    actual.retryable !== expected.retryable
  )
    return `expected retryable ${expected.retryable}, got ${actual.retryable}`;
  return undefined;
}

function compareOut(
  effects: Flow.StepEffect[],
  example: Flow.StepExample,
): string | undefined {
  if (example.out === undefined || isEqual(effects, example.out))
    return undefined;
  return `out differs: expected ${show(example.out)}, got ${show(effects)}`;
}

/** Common options of every kind. */
export interface RunOptions {
  /** The step's settings, pure JSON. */
  settings?: Record<string, unknown>;
  /** The package's examples env (`examples.env`: `push` and `simulation`). */
  env?: Record<string, unknown>;
}

export interface DestinationRunOptions extends RunOptions {
  /** Further destination config (consent, batch, mapping, loadScript). */
  config?: Partial<Destination.Config>;
  /** R3: the standard events the destination maps. */
  claims?: StandardEventName[];
}

export interface TransformerRunOptions extends RunOptions {
  config?: Partial<Transformer.Config>;
}

export interface StoreRunOptions extends RunOptions {
  config?: Partial<Store.Config>;
}

export interface SourceRunOptions extends RunOptions {
  config?: Partial<Source.Config>;
  /** The package's `createTrigger`, which feeds an example's `in`. */
  createTrigger?: Trigger.CreateFn;
}

/** The setup of an example's run. */
function setupOf(
  example: Flow.StepExample,
  options: RunOptions & { config?: object },
  mapping?: Mapping.Rules,
): Setup {
  const respond = example.respond;
  const config: Record<string, unknown> = { ...options.config };
  if (mapping) config.mapping = mapping;
  if (respond?.error === 'timeout' && config.timeout === undefined)
    config.timeout = RUN_TIMEOUT;
  return {
    settings: options.settings,
    config,
    env: readEnv(options.env),
    answers: () => answerOf(respond),
    envAnswers: () => envAnswerOf(respond),
  };
}

/**
 * The keys a `walker consent` example revokes (sets to `false`). An example
 * without any is not a revoke example.
 */
export function revokedKeys(example: Flow.StepExample): string[] {
  if (example.command !== 'consent' || !isObject(example.in)) return [];
  return Object.entries(example.in)
    .filter(([, value]) => value === false)
    .map(([key]) => key);
}

/** Run one destination example; its problems, empty when it holds. */
export async function checkDestinationExample(
  step: Destination.Instance<Destination.TypesGeneric>,
  example: Flow.StepExample,
  options: DestinationRunOptions,
): Promise<string[]> {
  const input = inputOf(example);
  if (typeof input === 'string') return [input];
  const setup = setupOf(example, options, mappingOf(example, input));

  // A revoke runs as a revocation happens: the destination is gated on the
  // revoked keys and granted them first; only the revoke's own effects
  // count, the grant's stay out like the init's.
  const revoked = revokedKeys(example);
  const grant = Object.fromEntries(revoked.map((key) => [key, true]));
  if (revoked.length) setup.config = { ...setup.config, consent: grant };

  const session = await openDestination(step, setup);
  try {
    if (revoked.length) await session.run({ command: 'consent', data: grant });
    const { result, effects } = await session.run(input);
    const problems: string[] = [];
    const out = compareOut(effects, example);
    if (out) problems.push(out);
    const outcome = compareOutcome(outcomeOf(result), example.outcome);
    if (outcome) problems.push(outcome);
    return problems;
  } finally {
    await session.close();
  }
}

async function checkTransformerExample(
  step: Transformer.Init<Transformer.TypesGeneric>,
  example: Flow.StepExample,
  options: TransformerRunOptions,
): Promise<string[]> {
  if (!isEvent(example.in))
    return ['its in is not an event (an object with a name)'];
  const session = await openTransformer(step, setupOf(example, options));
  try {
    const { result, effects } = await session.run({ event: example.in });
    const problems: string[] = [];
    const out = compareOut(effects, example);
    if (out) problems.push(out);
    const outcome = compareOutcome(outcomeOf(result), example.outcome);
    if (outcome) problems.push(outcome);
    return problems;
  } finally {
    await session.close();
  }
}

async function checkStoreExample(
  step: Store.Init<Store.TypesGeneric>,
  example: Flow.StepExample,
  options: StoreRunOptions,
): Promise<string[]> {
  if (!isStoreOperation(example.in))
    return ['its in is not a store operation ({ operation, key, value? })'];
  const session = await openStore(step, setupOf(example, options));
  try {
    let effect: Flow.StepEffect;
    try {
      effect = await runStoreOperation(session, example.in);
    } catch (error) {
      const code = error instanceof StepError ? error.code : 'transport';
      const outcome = compareOutcome(
        { status: 'failed', code },
        example.outcome,
      );
      return outcome ? [outcome] : [];
    }
    const problems: string[] = [];
    const out = compareOut([effect], example);
    if (out) problems.push(out);
    const outcome = compareOutcome(undefined, example.outcome);
    if (outcome) problems.push(outcome);
    return problems;
  } finally {
    await session.close();
  }
}

/** The config a source's createTrigger starts, events captured at the end. */
export function sourceConfig(
  step: Source.Init<Source.TypesGeneric>,
  options: SourceRunOptions,
  captured: Flow.StepEffect[],
  logs: LogLine[],
  settings: unknown = options.settings,
): Collector.InitConfig {
  const env = readEnv(options.env);
  const terminus: Collector.PushFn = async (event) => {
    captured.push(['elb', event]);
    return { ok: true };
  };
  return {
    logger: {
      level: 'DEBUG',
      handler: (level, message, context, scope) => {
        logs.push({ level, message, context, scope });
      },
    },
    sources: {
      [STEP_ID]: {
        code: step,
        config: {
          ...options.config,
          ...(settings !== undefined ? { settings } : {}),
        },
        ...(env ? { env: env.push } : {}),
        terminus,
      },
    },
  };
}

async function checkSourceExample(
  step: Source.Init<Source.TypesGeneric>,
  example: Flow.StepExample,
  options: SourceRunOptions,
): Promise<string[]> {
  if (!options.createTrigger)
    return ['sources run through the package createTrigger: pass it'];
  const captured: Flow.StepEffect[] = [];
  const instance = await options.createTrigger(
    sourceConfig(step, options, captured, []),
  );
  try {
    await instance.trigger(
      example.trigger?.type,
      example.trigger?.options,
    )(example.in);
    const out = compareOut(captured, example);
    return out ? [out] : [];
  } finally {
    await instance.flow?.collector.command('shutdown');
  }
}

/**
 * R1, R3, R6: each claimed standard event has a public example (looked up
 * by its event name) that starts from the pinned `getEvent(name)`, and each
 * public event example is claimed.
 */
export function checkClaims(
  examples: Flow.StepExamples,
  claims: StandardEventName[],
): string[] {
  const problems: string[] = [];
  const publicEvents = Object.entries(examples).filter(
    ([, example]) =>
      example.public !== false && !example.command && isEvent(example.in),
  );

  for (const claim of claims) {
    const found = publicEvents.find(
      ([, example]) => isEvent(example.in) && example.in.name === claim,
    );
    if (!found) {
      problems.push(`claim ${claim}: no public example for it`);
      continue;
    }
    const [name, example] = found;
    if (isEvent(example.in) && example.in.id !== getEvent(claim).id)
      problems.push(
        `claim ${claim}: example ${name} does not start from getEvent('${claim}')`,
      );
  }

  for (const [name, example] of publicEvents) {
    const eventName = isEvent(example.in) ? example.in.name : undefined;
    if (!claims.some((claim) => claim === eventName))
      problems.push(`example ${name}: ${eventName} is public but not claimed`);
  }

  return problems;
}

type RunArgs =
  | [
      'destination',
      Destination.Instance<Destination.TypesGeneric>,
      Flow.StepExamples,
      DestinationRunOptions,
    ]
  | [
      'transformer',
      Transformer.Init<Transformer.TypesGeneric>,
      Flow.StepExamples,
      TransformerRunOptions,
    ]
  | [
      'store',
      Store.Init<Store.TypesGeneric>,
      Flow.StepExamples,
      StoreRunOptions,
    ]
  | [
      'source',
      Source.Init<Source.TypesGeneric>,
      Flow.StepExamples,
      SourceRunOptions,
    ];

/** The arguments as given: the options are optional. */
type RunArgsGiven =
  | [
      'destination',
      Destination.Instance<Destination.TypesGeneric>,
      Flow.StepExamples,
      DestinationRunOptions?,
    ]
  | [
      'transformer',
      Transformer.Init<Transformer.TypesGeneric>,
      Flow.StepExamples,
      TransformerRunOptions?,
    ]
  | [
      'store',
      Store.Init<Store.TypesGeneric>,
      Flow.StepExamples,
      StoreRunOptions?,
    ]
  | [
      'source',
      Source.Init<Source.TypesGeneric>,
      Flow.StepExamples,
      SourceRunOptions?,
    ];

function complete(args: RunArgsGiven): RunArgs {
  switch (args[0]) {
    case 'destination':
      return ['destination', args[1], args[2], args[3] ?? {}];
    case 'transformer':
      return ['transformer', args[1], args[2], args[3] ?? {}];
    case 'store':
      return ['store', args[1], args[2], args[3] ?? {}];
    case 'source':
      return ['source', args[1], args[2], args[3] ?? {}];
  }
}

async function checkExample(
  args: RunArgs,
  example: Flow.StepExample,
): Promise<string[]> {
  switch (args[0]) {
    case 'destination':
      return checkDestinationExample(args[1], example, args[3]);
    case 'transformer':
      return checkTransformerExample(args[1], example, args[3]);
    case 'store':
      return checkStoreExample(args[1], example, args[3]);
    case 'source':
      return checkSourceExample(args[1], example, args[3]);
  }
}

/**
 * Run every example of a step through a real collector and compare its `out`
 * (R4, as a literal) and `outcome`. Resolves when every example holds;
 * otherwise rejects with one error naming each failing example.
 */
export function runExamples<T extends Destination.TypesGeneric>(
  kind: 'destination',
  step: Destination.Instance<T>,
  examples: Flow.StepExamples,
  options?: DestinationRunOptions,
): Promise<void>;
export function runExamples<T extends Transformer.TypesGeneric>(
  kind: 'transformer',
  step: Transformer.Init<T>,
  examples: Flow.StepExamples,
  options?: TransformerRunOptions,
): Promise<void>;
export function runExamples<T extends Store.TypesGeneric>(
  kind: 'store',
  step: Store.Init<T>,
  examples: Flow.StepExamples,
  options?: StoreRunOptions,
): Promise<void>;
export function runExamples<T extends Source.TypesGeneric>(
  kind: 'source',
  step: Source.Init<T>,
  examples: Flow.StepExamples,
  options?: SourceRunOptions,
): Promise<void>;
export async function runExamples(...given: RunArgsGiven): Promise<void> {
  const args = complete(given);
  const examples = args[2];
  const problems: string[] = [];

  if (args[0] === 'destination' && args[3].claims)
    problems.push(...checkClaims(examples, args[3].claims));

  for (const [name, example] of Object.entries(examples)) {
    if (example.respond?.error === 'timeout' && timersAreFake())
      throw new Error(
        `example ${name} waits for a timeout: call jest.useRealTimers() first`,
      );
    for (const problem of await checkExample(args, example))
      problems.push(`example ${name}: ${problem}`);
  }

  if (problems.length) throw new Error(problems.join('\n'));
}
