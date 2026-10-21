import type {
  Collector,
  Destination,
  Flow,
  Source,
  Store,
  Transformer,
  Trigger,
  WalkerOS,
} from '@walkeros/core';
import type { JSONSchema } from '@walkeros/core/dev';
import { getEvent, isObject, Level, StepError } from '@walkeros/core';
import type { Answer, EnvAnswer } from './boundary';
import type {
  ExamplesEnv,
  LogLine,
  Session,
  Setup,
  Step,
  StoreOperation,
} from './runExamples';
import {
  checkDestinationExample,
  isEqual,
  isEvent,
  isStoreOperation,
  mappingOf,
  openDestination,
  openSource,
  openStore,
  openTransformer,
  outcomeOf,
  readEnv,
  revokedKeys,
  RUN_TIMEOUT,
  runExamples,
  runStoreOperation,
  show,
  sourceConfig,
  STEP_ID,
  timersAreFake,
  VENDOR_SCRIPT_MARKER,
} from './runExamples';

/**
 * The conformance kit: the checks of the step contract (design Q9 plus item
 * 11), run on a real collector with the boundary under the kit's control.
 * Each package declares one profile; the profile, not the package, decides
 * which checks run, so no package skips a check of its own.
 */

/** The boundary a package's step talks to, which decides its checks. */
export type Profile =
  | 'http'
  | 'sdk-env'
  | 'web-sdk'
  | 'vendor-global'
  | 'socket'
  | 'transformer'
  | 'source';

export interface ConformanceOptions {
  profile: Profile;
  examples: Flow.StepExamples;
  /**
   * The settings schema (JSON Schema): its properties, `required`, and
   * `anyOf`/`oneOf` alternatives for a "one of these" rule (item 4).
   */
  schema: JSONSchema;
  /** Minimal valid settings, pure JSON. */
  settings: Record<string, unknown>;
  /** The package directory; item 6 scans `<root>/src`. */
  root: string;
  /** The examples env (`examples.env`) where the boundary is the SDK client. */
  env?: Record<string, unknown>;
  /** Settings forwarded into an SDK as a whole (read, never named in src). */
  passThrough?: string[];
  /** Sources: the package's `createTrigger`, which feeds the examples. */
  createTrigger?: Trigger.CreateFn;
}

/** Every failed check of one conformance run: `items` lists their numbers. */
export class ConformanceError extends Error {
  items: number[];

  constructor(failures: Array<[number, string]>) {
    super(
      failures.map(([item, problem]) => `item ${item}: ${problem}`).join('; '),
    );
    this.name = 'ConformanceError';
    this.items = failures.map(([item]) => item);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Checks per profile (design Q9 table plus the two named profiles). */
const PROFILE_ITEMS: Record<Profile, number[]> = {
  http: [1, 2, 3, 4, 5, 6, 7, 9, 10],
  'sdk-env': [1, 2, 3, 4, 5, 6, 7, 9, 10],
  // A web SDK starts in init at page load on purpose (autocapture, recording).
  'web-sdk': [1, 2, 3, 4, 6, 7, 9, 10],
  'vendor-global': [1, 2, 4, 6, 7, 8, 10],
  socket: [1, 2, 3, 4, 5, 6, 7, 9],
  transformer: [1, 2, 4, 5, 6, 7, 10],
  source: [1, 4, 5, 6, 7],
};

/** The value item 7 plants in an event and the boundary echoes on failure. */
const CANARY = 'kit-canary-5f9e2c1a';

/** Failure codes that mean the step did not start with its settings. */
const NOT_STARTED = ['config', 'not-ready'];

type Problem = string | undefined;

/** A success event example: an event, no declared outcome or failure answer. */
interface EventExample {
  name: string;
  example: Flow.StepExample;
  event: WalkerOS.DeepPartialEvent;
}

interface Context {
  profile: Profile;
  options: ConformanceOptions;
  env?: ExamplesEnv;
  /** Env the run uses: the examples env except where the profile has none. */
  runEnv?: ExamplesEnv;
  schemaKeys: string[];
  requires: Requirements;
  events: EventExample[];
  /** The first success event example that sends something. */
  primary?: EventExample;
}

/** Whether an example's rule skips the default call (`silent`, `ignore`). */
const quiet = (example: Flow.StepExample) =>
  isObject(example.mapping) &&
  (example.mapping.silent === true || example.mapping.ignore === true);

/** Whether an example sends something: its declared out, else its rule. */
const sends = (example: Flow.StepExample) =>
  Array.isArray(example.out) ? example.out.length > 0 : !quiet(example);

function contextOf(options: ConformanceOptions): Context {
  const env = readEnv(options.env);
  const properties = options.schema.properties;
  const events: EventExample[] = [];
  for (const [name, example] of Object.entries(options.examples)) {
    if (example.command || example.outcome || example.respond) continue;
    if (isEvent(example.in)) events.push({ name, example, event: example.in });
  }
  const primary = events.find(({ example }) => sends(example));
  return {
    profile: options.profile,
    options,
    env,
    runEnv: options.profile === 'http' ? undefined : env,
    schemaKeys: isObject(properties) ? Object.keys(properties) : [],
    requires: requirementsOf(options.schema),
    events,
    primary: primary ?? events[0],
  };
}

const errorsIn = (logs: LogLine[]) =>
  logs.filter((line) => line.level === Level.ERROR).length;

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
}

/** Escape a key for a word-boundary match. */
function wordIn(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

function stepError(error: unknown): StepError | undefined {
  return error instanceof StepError ? error : undefined;
}

/**
 * What a settings schema requires: keys it always requires (top-level
 * `required`), and groups of alternatives (`anyOf`/`oneOf`, also inside
 * `allOf`) of which at least one branch must hold. A branch's keys are its
 * `required` names, as dotted paths where the named property requires keys
 * of its own (`ga4.measurementId`).
 */
interface Requirements {
  keys: string[];
  alternatives: string[][][];
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function propertyOf(properties: unknown, key: string): unknown {
  return isObject(properties) ? properties[key] : undefined;
}

/** The keys a schema node requires, nested `required` as dotted paths. */
function requiredPaths(
  node: unknown,
  properties: unknown,
  prefix = '',
  depth = 0,
): string[] {
  if (!isObject(node) || depth > 5) return [];
  return stringsOf(node.required).flatMap((name) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const child =
      propertyOf(node.properties, name) ?? propertyOf(properties, name);
    const inner = requiredPaths(child, undefined, path, depth + 1);
    return inner.length ? inner : [path];
  });
}

function requirementsOf(schema: JSONSchema): Requirements {
  const alternatives: string[][][] = [];
  const collect = (node: unknown) => {
    if (!isObject(node)) return;
    for (const branches of [node.anyOf, node.oneOf]) {
      if (!Array.isArray(branches) || !branches.length) continue;
      const keys = branches.map((branch) =>
        requiredPaths(branch, schema.properties),
      );
      // A branch that requires nothing lets {} pass: nothing is required.
      if (keys.every((branch) => branch.length)) alternatives.push(keys);
    }
    if (Array.isArray(node.allOf)) node.allOf.forEach(collect);
  };
  collect(schema);
  return { keys: stringsOf(schema.required), alternatives };
}

const requiresSomething = ({ keys, alternatives }: Requirements) =>
  keys.length > 0 || alternatives.length > 0;

/** The requirements as words for a message: `a, b and c or d`. */
function describeRequired({ keys, alternatives }: Requirements): string {
  return [
    ...keys,
    ...alternatives.map((branches) =>
      branches.map((branch) => branch.join(' and ')).join(' or '),
    ),
  ].join(', ');
}

/** Problems of what init threw with `settings: {}` (item 4). */
function notReadyProblem(ctx: Context, thrown: unknown[]): Problem {
  const { requires } = ctx;
  if (!requiresSomething(requires)) {
    const failed = thrown.map(stepError).find((error) => error);
    return failed && NOT_STARTED.includes(failed.code)
      ? `fails ${failed.code} with settings {} although the schema requires nothing`
      : undefined;
  }
  const naming = describeRequired(requires);
  if (!thrown.length)
    return `init does not throw with settings {}: it must throw a StepError naming ${naming}`;
  const error = stepError(thrown[0]);
  if (!error)
    return `init throws a plain error with settings {}: throw a StepError with code config naming ${naming}`;
  if (error.code !== 'config')
    return `init throws code ${error.code} with settings {}: the code is config`;
  const { message } = error;
  const missing = requires.keys.filter((key) => !wordIn(message, key));
  if (missing.length)
    return `the init error does not name the required ${missing.join(', ')}`;
  for (const branches of requires.alternatives) {
    const unnamed = branches.find(
      (branch) => !branch.some((key) => wordIn(message, key)),
    );
    if (unnamed)
      return `the init error names no key of the alternative ${unnamed.join(' and ')}`;
  }
  const allowed = new Set([
    ...requires.keys,
    ...requires.alternatives.flat(2).map((path) => path.split('.')[0]),
  ]);
  const extra = ctx.schemaKeys.filter(
    (key) => !allowed.has(key) && wordIn(message, key),
  );
  if (extra.length)
    return `the init error names ${extra.join(', ')}, which the schema does not require`;
  return undefined;
}

/** The failure code a run reports for the step; a queued event has none. */
function failedCode(step: Step): string | undefined {
  const outcome = outcomeOf(step.result);
  return outcome?.status === 'failed' ? outcome.code : undefined;
}

/** A copy of the event with the canary in its data, user and globals. */
function withCanary(
  event: WalkerOS.DeepPartialEvent,
): WalkerOS.DeepPartialEvent {
  return {
    ...event,
    data: { ...event.data, kitCanary: CANARY },
    user: { ...event.user, kitCanary: CANARY },
    globals: { ...event.globals, kitCanary: CANARY },
  };
}

/** Where the canary leaked: a log line or the reported error text. */
function leaks(logs: LogLine[], step?: Step): string[] {
  const found: string[] = [];
  for (const line of logs)
    if (line.message.includes(CANARY) || textOf(line.context).includes(CANARY))
      found.push(`the log line "${line.message.slice(0, 80)}"`);
  if (step) {
    const { result } = step;
    const texts = [
      result.error,
      result.reason?.message,
      ...Object.values(result.failed ?? {}).flatMap((ref) => [
        ref.reason?.message,
        textOf(ref.error),
      ]),
    ];
    if (texts.some((text) => typeof text === 'string' && text.includes(CANARY)))
      found.push('the reported error message');
  }
  return found;
}

/** Item 6, static half: settings keys no source file mentions. */
async function unreadKeys(ctx: Context): Promise<string[]> {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const skipDirs = ['schemas', 'examples', '__tests__', '__mocks__'];
  const skipFiles = ['schemas.ts', 'hints.ts', 'dev.ts'];

  async function text(dir: string): Promise<string> {
    let content = '';
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name)) content += await text(path);
      } else if (
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !skipFiles.includes(entry.name)
      )
        content += await readFile(path, 'utf8');
    }
    return content;
  }

  const source = await text(join(ctx.options.root, 'src'));
  const passThrough = ctx.options.passThrough ?? [];
  return ctx.schemaKeys.filter(
    (key) => !passThrough.includes(key) && !wordIn(source, key),
  );
}

/** Item 6, both halves, from the keys the runs read. */
async function settingsProblem(
  ctx: Context,
  reads: Set<string>,
): Promise<Problem> {
  const problems: string[] = [];
  const unread = await unreadKeys(ctx);
  if (unread.length)
    problems.push(`no source reads the schema key(s) ${unread.join(', ')}`);
  const unknown = [...reads].filter((key) => !ctx.schemaKeys.includes(key));
  if (unknown.length)
    problems.push(`reads ${unknown.join(', ')}, which the schema lacks`);
  const forwarded = (ctx.options.passThrough ?? []).filter(
    (key) => !reads.has(key),
  );
  if (forwarded.length)
    problems.push(
      `passThrough ${forwarded.join(', ')} is never forwarded in an example`,
    );
  return problems.length ? problems.join(', ') : undefined;
}

function pureJson(settings: Record<string, unknown>): boolean {
  try {
    return isEqual(JSON.parse(JSON.stringify(settings)), settings);
  } catch {
    return false;
  }
}

/** The failures item 2 answers at the fetch boundary, one run each. */
const failureAnswers: Array<{ label: string; answer: Answer }> = [
  { label: 'HTTP 500', answer: { status: 500, body: { error: 'busy' } } },
  { label: 'a network error', answer: { error: 'network' } },
  { label: 'a timeout', answer: { error: 'timeout' } },
];

/** The failures item 2 answers at the SDK boundary, one run each. */
const failureEnvAnswers: Array<{ label: string; answer: EnvAnswer }> = [
  {
    label: 'a rejected SDK call',
    answer: { kind: 'reject', error: new Error('Connection refused') },
  },
  { label: 'an SDK call that never settles', answer: { kind: 'hang' } },
];

/* ------------------------------------------------------------------------ */
/* Destinations                                                              */
/* ------------------------------------------------------------------------ */

type DestinationStep = Destination.Instance<Destination.TypesGeneric>;

interface DestinationRun extends Step {
  /** Every log line of the session, from startFlow through the run. */
  sessionLogs: LogLine[];
  initCalls: number;
  scripts: { marked: number; unmarked: number };
  dlq: WalkerOS.Event[];
  status?: Collector.DestinationStatus;
}

/** Open, run one event, collect what the kit reads, close. */
async function runDestination(
  step: DestinationStep,
  ctx: Context,
  target: EventExample,
  setup: Setup,
  event: WalkerOS.DeepPartialEvent = target.event,
  ingest?: Record<string, unknown>,
): Promise<DestinationRun> {
  const mapping = mappingOf(target.example, { event: target.event });
  const session = await openDestination(step, {
    env: ctx.runEnv,
    ...setup,
    config: {
      timeout: RUN_TIMEOUT,
      ...(mapping ? { mapping } : {}),
      ...setup.config,
    },
  });
  try {
    const run = await session.run({ event, ingest });
    return {
      ...run,
      sessionLogs: [...session.logs],
      initCalls: session.initCalls(),
      scripts: session.scripts(),
      dlq: (session.collector.destinations[STEP_ID]?.dlq ?? []).map(
        ([queued]) => queued,
      ),
      status: session.collector.status.destinations[STEP_ID],
    };
  } finally {
    await session.close();
  }
}

/** One problem per failure answer that is not reported as the contract says. */
function reportProblem(label: string, run: DestinationRun): Problem {
  const reason = run.result.failed?.[STEP_ID]?.reason;
  if (!reason || !('retryable' in reason))
    return `${label} is not reported (no failed reason)`;
  if (label === 'HTTP 500' && reason.status !== 500)
    return `${label} is reported without its status`;
  if (!reason.retryable) return `${label} is reported as not retryable`;
  if (!run.dlq.length) return `${label} leaves the DLQ empty`;
  // The whole session: a destination initialized inside startFlow writes
  // its one line there, and the run's retry of the same cause is suppressed.
  const errors = errorsIn(run.sessionLogs);
  if (errors !== 1)
    return `${label} writes ${errors} ERROR lines instead of the collector's one`;
  return undefined;
}

async function destinationItem(
  item: number,
  step: DestinationStep,
  ctx: Context,
): Promise<Problem> {
  const { options, primary } = ctx;
  const base: Setup = { settings: options.settings };

  switch (item) {
    case 1: {
      if (!pureJson(options.settings)) return 'settings are not pure JSON';
      if (!ctx.events.length) return 'no success event example to run';
      const problems: string[] = [];
      for (const target of ctx.events) {
        const run = await runDestination(step, ctx, target, {
          ...base,
          env: undefined,
        });
        const code = failedCode(run);
        if (ctx.profile === 'http') {
          if (code)
            problems.push(`example ${target.name} fails ${code} without env`);
          if (sends(target.example) && !run.effects.length)
            problems.push(
              `example ${target.name} sends no request through fetch, sendBeacon or XMLHttpRequest`,
            );
        } else if (code && NOT_STARTED.includes(code))
          problems.push(`example ${target.name} fails ${code} without env`);
        if (ctx.profile === 'vendor-global' && run.scripts.unmarked)
          problems.push(
            `example ${target.name} inserts a script without loadVendor`,
          );
      }
      return problems.length ? problems.join(', ') : undefined;
    }

    case 2: {
      if (!primary) return 'no success event example to fail';
      if (ctx.profile === 'vendor-global')
        return vendorFailureProblem(step, ctx, primary);
      if (ctx.profile === 'http') {
        for (const { label, answer } of failureAnswers) {
          const run = await runDestination(step, ctx, primary, {
            ...base,
            answers: () => answer,
          });
          const problem = reportProblem(label, run);
          if (problem) return problem;
        }
        return undefined;
      }
      if (!ctx.env) return declaredFailures(step, ctx);
      for (const { label, answer } of failureEnvAnswers) {
        const run = await runDestination(step, ctx, primary, {
          ...base,
          envAnswers: () => answer,
        });
        const problem = reportProblem(label, run);
        if (problem) return problem;
      }
      return undefined;
    }

    case 3: {
      if (!primary) return 'no success event example to run';
      const run = await runDestination(step, ctx, primary, {
        ...base,
        answers: () => ({ late: true }),
        envAnswers: () => ({ kind: 'late' }),
      });
      if (!run.effects.length && !run.pending)
        return 'the example sent nothing to answer late';
      return run.pending
        ? 'the push settled before its request did (a floating send)'
        : undefined;
    }

    case 4: {
      const target = primary ?? {
        name: 'page view',
        example: {},
        event: getEvent('page view'),
      };
      if (requiresSomething(ctx.requires) && !step.init)
        return `checks no settings in init: init must throw a StepError naming ${describeRequired(ctx.requires)}`;
      const thrown: unknown[] = [];
      await runDestination(step, ctx, target, {
        settings: {},
        initError: (error) => thrown.push(error),
      });
      return notReadyProblem(ctx, thrown);
    }

    case 5: {
      if (!primary) return 'no success event example to run';
      const run = await runDestination(step, ctx, primary, base);
      return run.initCalls
        ? `init makes ${run.initCalls} request(s) or SDK call(s); init stays offline`
        : undefined;
    }

    case 6: {
      const reads = new Set<string>();
      for (const target of ctx.events)
        await runDestination(step, ctx, target, { ...base, reads });
      return settingsProblem(ctx, reads);
    }

    case 7: {
      if (!primary) return 'no success event example to run';
      const event = withCanary(primary.event);
      const ingest = { kitCanary: CANARY };
      const found: string[] = [];
      const runs = [
        await runDestination(step, ctx, primary, base, event, ingest),
        await runDestination(
          step,
          ctx,
          primary,
          {
            ...base,
            answers: () => ({
              status: 500,
              body: { error: CANARY },
              statusText: CANARY,
            }),
            envAnswers: () => ({
              kind: 'reject',
              error: new Error(`Request failed: ${CANARY}`),
            }),
          },
          event,
          ingest,
        ),
      ];
      for (const run of runs) found.push(...leaks(run.logs, run));
      return found.length
        ? `personal data reaches ${[...new Set(found)].join(', ')}`
        : undefined;
    }

    case 8: {
      // Each revoke runs gated on its revoked keys, granted first (I1).
      const revokes = Object.entries(options.examples).filter(
        ([, example]) => revokedKeys(example).length > 0,
      );
      if (!revokes.length)
        return 'no walker consent revoke example (its out is the vendor consent call, or [] with a description)';
      const problems: string[] = [];
      for (const [name, example] of revokes) {
        if (!Array.isArray(example.out)) {
          problems.push(
            `example ${name} declares no out (the vendor consent call, or [] with a description)`,
          );
          continue;
        }
        if (example.out.length === 0 && !example.description)
          problems.push(
            `example ${name}: out [] needs a description saying why no consent call is needed`,
          );
        for (const problem of await checkDestinationExample(step, example, {
          settings: options.settings,
          env: options.env,
        }))
          problems.push(`example ${name}: ${problem}`);
      }
      return problems.length ? problems.join(', ') : undefined;
    }

    case 9:
      return batchProblem(step, ctx);

    case 10:
      return strippedProblem(ctx, async (target, event) => {
        const run = await runDestination(step, ctx, target, base, event);
        return {
          step: run,
          delivered: Boolean(run.result.done?.[STEP_ID]) && !run.effects.length,
        };
      });

    case 11: {
      const silent = Object.entries(options.examples).filter(
        ([, example]) =>
          example.public === false &&
          isObject(example.mapping) &&
          example.mapping.silent === true,
      );
      if (!silent.length)
        return 'no public: false example with a silent: true rule';
      const problems: string[] = [];
      for (const [name, example] of silent) {
        if (!Array.isArray(example.out)) {
          problems.push(
            `example ${name} declares no out (the calls the rule settings describe, usually [])`,
          );
          continue;
        }
        for (const problem of await checkDestinationExample(step, example, {
          settings: options.settings,
          env: ctx.runEnv ? options.env : undefined,
        }))
          problems.push(`example ${name}: ${problem}`);
      }
      return problems.length ? problems.join(', ') : undefined;
    }
  }
  return undefined;
}

/** Item 2 without an injectable boundary: the declared failure examples. */
async function declaredFailures(
  step: DestinationStep,
  ctx: Context,
): Promise<Problem> {
  const failures = Object.entries(ctx.options.examples).filter(
    ([, example]) => example.outcome?.status === 'failed',
  );
  if (!failures.length)
    return 'no boundary to fail (pass env) and no failure example (outcome failed)';
  const problems: string[] = [];
  for (const [name, example] of failures)
    for (const problem of await checkDestinationExample(step, example, {
      settings: ctx.options.settings,
      env: ctx.options.env,
    }))
      problems.push(`example ${name}: ${problem}`);
  return problems.length ? problems.join(', ') : undefined;
}

/** Item 2 for vendor globals: an injected script that fires `error`. */
async function vendorFailureProblem(
  step: DestinationStep,
  ctx: Context,
  primary: EventExample,
): Promise<Problem> {
  const mapping = mappingOf(primary.example, { event: primary.event });
  const session = await openDestination(step, {
    settings: ctx.options.settings,
    env: ctx.env,
    config: {
      timeout: RUN_TIMEOUT,
      loadScript: true,
      ...(mapping ? { mapping } : {}),
    },
  });
  try {
    await session.run({ event: primary.event });
    if (!session.scripts().marked) return declaredFailures(step, ctx);

    document
      .querySelectorAll(`script[${VENDOR_SCRIPT_MARKER}]`)
      .forEach((script) => script.dispatchEvent(new Event('error')));
    const run = await session.run({ event: primary.event });
    const reason = run.result.failed?.[STEP_ID]?.reason;
    if (reason?.code !== 'vendor-not-loaded')
      return `a push after the vendor script failed is not reported vendor-not-loaded (${show(reason)})`;
    const dlq = session.collector.destinations[STEP_ID]?.dlq ?? [];
    if (!dlq.length) return 'the vendor-not-loaded event is not in the DLQ';
    const errors = errorsIn(session.logs);
    return errors === 1
      ? undefined
      : `vendor-not-loaded writes ${errors} ERROR lines instead of the collector's one`;
  } finally {
    await session.close();
  }
}

/** Item 9: one chunk of a batch fails, the others land, the counts add up. */
async function batchProblem(
  step: DestinationStep,
  ctx: Context,
): Promise<Problem> {
  const { primary } = ctx;
  if (!primary) return 'no success event example to batch';
  const mapping = mappingOf(primary.example, { event: primary.event });
  const session = await openDestination(step, {
    settings: ctx.options.settings,
    env: ctx.runEnv,
    config: {
      timeout: RUN_TIMEOUT,
      batch: { size: 1000, wait: 60_000 },
      ...(mapping ? { mapping } : {}),
    },
    answers: (index) => (index === 0 ? { status: 500 } : {}),
    envAnswers: (index) =>
      index === 0
        ? { kind: 'reject', error: new Error('Connection refused') }
        : { kind: 'pass' },
  });
  try {
    const events = [1, 2, 3].map((n) => ({
      ...primary.event,
      id: `${primary.event.id ?? 'event'}-${n}`,
    }));
    for (const event of events) await session.run({ event });
    await session.collector.command('flush');

    const status = session.collector.status.destinations[STEP_ID];
    const dlq = session.collector.destinations[STEP_ID]?.dlq ?? [];
    const requests =
      session.boundary.requests.length +
      (session.envBoundary?.calls.length ?? 0);
    if (!requests) return 'the batch sent nothing';
    if (!status?.failed) return 'a failed chunk is not reported (failed 0)';
    if (dlq.length !== status.failed)
      return `the DLQ holds ${dlq.length} events for ${status.failed} failed`;
    if (requests > 1 && !status.count)
      return 'one chunk failed and no other chunk landed';
    return undefined;
  } finally {
    await session.close();
  }
}

/** Item 10: an event without user, data, globals and context. */
async function strippedProblem(
  ctx: Context,
  run: (
    target: EventExample,
    event: WalkerOS.DeepPartialEvent,
  ) => Promise<{ step: Step; delivered: boolean }>,
): Promise<Problem> {
  // An example whose own out is [] sends nothing by design (silent, ignore).
  const sending = ctx.events.filter(({ example }) => sends(example));
  if (!sending.length) return 'no success event example that sends';
  const problems: string[] = [];
  for (const target of sending) {
    const { user, data, globals, context, ...stripped } = target.event;
    const { step, delivered } = await run(target, stripped);
    if (failedCode(step) === 'missing-input') {
      if (!declaresMissingInput(ctx.options.examples, stripped))
        problems.push(
          `example ${target.name} fails missing-input without an out: [] example for that shape with a description`,
        );
    } else if (delivered)
      problems.push(
        `example ${target.name} without user, data, globals and context counts as delivered but nothing was sent`,
      );
  }
  return problems.length ? problems.join(', ') : undefined;
}

const SHAPE_KEYS = ['user', 'data', 'globals', 'context'];

function declaresMissingInput(
  examples: Flow.StepExamples,
  stripped: WalkerOS.DeepPartialEvent,
): boolean {
  return Object.values(examples).some(
    (example) =>
      isEvent(example.in) &&
      example.in.name === stripped.name &&
      example.out?.length === 0 &&
      Boolean(example.description) &&
      example.outcome?.code === 'missing-input' &&
      SHAPE_KEYS.every((key) => {
        const value = isObject(example.in) ? example.in[key] : undefined;
        return (
          value === undefined || (isObject(value) && !Object.keys(value).length)
        );
      }),
  );
}

/* ------------------------------------------------------------------------ */
/* Transformers                                                              */
/* ------------------------------------------------------------------------ */

type TransformerStep = Transformer.Init<Transformer.TypesGeneric>;

interface TransformerRun extends Step {
  initCalls: number;
  /** What made the flow fail to start (a throwing transformer factory). */
  startError?: unknown;
}

async function runTransformer(
  step: TransformerStep,
  ctx: Context,
  setup: Setup,
  event: WalkerOS.DeepPartialEvent,
  ingest?: Record<string, unknown>,
): Promise<TransformerRun> {
  let session: Session;
  try {
    session = await openTransformer(step, {
      env: ctx.runEnv,
      ...setup,
      config: { ...setup.config },
    });
  } catch (startError) {
    return {
      result: { ok: false },
      effects: [],
      logs: [],
      pending: 0,
      initCalls: 0,
      startError,
    };
  }
  try {
    const run = await session.run({ event, ingest });
    return { ...run, initCalls: session.initCalls() };
  } finally {
    await session.close();
  }
}

/** A flow that did not start, as a problem; a StepError counts as reported. */
function startProblem(run: TransformerRun): Problem {
  if (run.startError === undefined) return undefined;
  return `the flow does not start: ${textOf(run.startError)}`;
}

async function transformerItem(
  item: number,
  step: TransformerStep,
  ctx: Context,
): Promise<Problem> {
  const { options, primary } = ctx;
  const base: Setup = { settings: options.settings };
  const event = primary?.event ?? getEvent('page view');

  switch (item) {
    case 1: {
      if (!pureJson(options.settings)) return 'settings are not pure JSON';
      const problems: string[] = [];
      for (const target of ctx.events) {
        const run = await runTransformer(
          step,
          ctx,
          { ...base, env: undefined },
          target.event,
        );
        const started = startProblem(run);
        if (started) problems.push(`example ${target.name}: ${started}`);
        const code = failedCode(run);
        if (code && NOT_STARTED.includes(code))
          problems.push(`example ${target.name} fails ${code} without env`);
      }
      return problems.length ? problems.join(', ') : undefined;
    }

    case 2: {
      const problems: string[] = [];
      if (requiresSomething(ctx.requires)) {
        const run = await runTransformer(step, ctx, { settings: {} }, event);
        // Refusing to start with a StepError is reported too, at the start.
        if (run.startError !== undefined) {
          if (!stepError(run.startError))
            problems.push(
              'a transformer that cannot work throws a plain error at the start: throw a StepError',
            );
        } else if (run.result.ok || !run.result.reason)
          problems.push(
            'a transformer that cannot work does not answer ok: false with a reason',
          );
        if (run.effects.length)
          problems.push('an event passes a transformer that cannot work');
      }
      const failures = Object.fromEntries(
        Object.entries(options.examples).filter(
          ([, example]) => example.outcome?.status === 'failed',
        ),
      );
      if (Object.keys(failures).length)
        await runExamples('transformer', step, failures, {
          settings: options.settings,
          env: options.env,
        }).catch((error: unknown) => problems.push(textOf(error)));
      return problems.length ? problems.join(', ') : undefined;
    }

    case 4: {
      const thrown: unknown[] = [];
      await runTransformer(
        step,
        ctx,
        { settings: {}, initError: (error) => thrown.push(error) },
        event,
      );
      return notReadyProblem(ctx, thrown);
    }

    case 5: {
      const run = await runTransformer(step, ctx, base, event);
      return (
        startProblem(run) ??
        (run.initCalls
          ? `init makes ${run.initCalls} request(s) or SDK call(s); init stays offline`
          : undefined)
      );
    }

    case 6: {
      const reads = new Set<string>();
      for (const target of ctx.events)
        await runTransformer(step, ctx, { ...base, reads }, target.event);
      return settingsProblem(ctx, reads);
    }

    case 7: {
      const run = await runTransformer(step, ctx, base, withCanary(event), {
        kitCanary: CANARY,
      });
      const found = leaks(run.logs, run);
      if (textOf(run.startError).includes(CANARY))
        found.push('the start error message');
      return (
        startProblem(run) ??
        (found.length
          ? `personal data reaches ${[...new Set(found)].join(', ')}`
          : undefined)
      );
    }

    case 10:
      if (!ctx.events.length) return ingestInputProblem(step, ctx);
      return strippedProblem(ctx, async (_, stripped) => {
        const run = await runTransformer(step, ctx, base, stripped);
        return {
          step: run,
          delivered: run.result.ok && !run.effects.length,
        };
      });
  }
  return undefined;
}

/**
 * Item 10 for a transformer whose input is the ingest (no success example
 * carries an event `in`, e.g. a request to decode): an event without that
 * ingest must be reported. Its declared `missing-input` example (an event
 * `in`, `out: []`, a description) runs and must hold.
 */
async function ingestInputProblem(
  step: TransformerStep,
  ctx: Context,
): Promise<Problem> {
  const declared = Object.entries(ctx.options.examples).filter(
    ([, example]) =>
      isEvent(example.in) &&
      example.outcome?.status === 'failed' &&
      example.outcome.code === 'missing-input' &&
      Array.isArray(example.out) &&
      example.out.length === 0 &&
      Boolean(example.description),
  );
  if (!declared.length)
    return 'no example carries an event, and no missing-input example (an event without the ingest, out: [], a description) shows it is reported';
  return runExamples('transformer', step, Object.fromEntries(declared), {
    settings: ctx.options.settings,
    env: ctx.options.env,
  }).then(
    () => undefined,
    (error: unknown) => textOf(error),
  );
}

/* ------------------------------------------------------------------------ */
/* Stores                                                                    */
/* ------------------------------------------------------------------------ */

type StoreStep = Store.Init<Store.TypesGeneric>;

function operationsOf(examples: Flow.StepExamples): StoreOperation[] {
  return Object.values(examples).flatMap((example) =>
    !example.outcome && isStoreOperation(example.in) ? [example.in] : [],
  );
}

async function withStore<R>(
  step: StoreStep,
  setup: Setup,
  fn: (session: Session) => Promise<R>,
): Promise<R> {
  const session = await openStore(step, setup);
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

/**
 * Which operation examples reach the SDK boundary in a normal run (at least
 * one call on the examples env), from the session's own call record. Items 2
 * and 3 judge those only; an operation that no example reaches fails them,
 * so a store cannot pass by never calling its client.
 */
async function reachingOperations(
  step: StoreStep,
  base: Setup,
  operations: StoreOperation[],
): Promise<{ reaching: StoreOperation[]; problems: string[] }> {
  const reached = await withStore(step, base, async (session) => {
    const flags: boolean[] = [];
    for (const operation of operations) {
      const before = session.envBoundary?.calls.length ?? 0;
      await runStoreOperation(session, operation).catch(() => undefined);
      flags.push((session.envBoundary?.calls.length ?? 0) > before);
    }
    return flags;
  });
  const reaching = operations.filter((_, index) => reached[index]);
  const kinds = [...new Set(operations.map(({ operation }) => operation))];
  const problems = kinds
    .filter((kind) => !reaching.some(({ operation }) => operation === kind))
    .map((kind) => `no example of ${kind} reaches the SDK`);
  return { reaching, problems };
}

async function storeItem(
  item: number,
  step: StoreStep,
  ctx: Context,
): Promise<Problem> {
  const { options } = ctx;
  const operations = operationsOf(options.examples);
  const base: Setup = { settings: options.settings, env: ctx.env };

  switch (item) {
    case 1: {
      if (!pureJson(options.settings)) return 'settings are not pure JSON';
      const thrown: unknown[] = [];
      await withStore(
        step,
        { settings: options.settings, initError: (e) => thrown.push(e) },
        async () => undefined,
      ).catch((error: unknown) => thrown.push(error));
      return thrown.length
        ? `does not start without env: ${textOf(thrown[0])}`
        : undefined;
    }

    case 2: {
      if (!ctx.env) return storeDeclaredFailures(step, ctx);
      if (!operations.length) return 'no store operation example to fail';
      const { reaching, problems } = await reachingOperations(
        step,
        base,
        operations,
      );
      for (const { label, answer } of failureEnvAnswers) {
        // A store call has no collector timeout around it here: a call that
        // never settles is item 3's late answer, not a failure to wait for.
        if (answer.kind === 'hang') continue;
        await withStore(
          step,
          { ...base, envAnswers: () => answer },
          async (session) => {
            for (const operation of reaching) {
              const logsBefore = session.logs.length;
              const error = await runStoreOperation(session, operation).then(
                () => undefined,
                (thrown: unknown) => thrown,
              );
              if (!stepError(error))
                problems.push(
                  `${label} on ${operation.operation} ${error ? 'throws a plain error' : 'is not reported'}: throw a StepError`,
                );
              if (errorsIn(session.logs.slice(logsBefore)))
                problems.push(
                  `${label} on ${operation.operation} is logged by the store; the collector writes the one line`,
                );
            }
          },
        );
      }
      return problems.length ? [...new Set(problems)].join(', ') : undefined;
    }

    case 3: {
      if (!ctx.env) return 'no SDK boundary to answer late (pass env)';
      const { reaching, problems } = await reachingOperations(
        step,
        base,
        operations,
      );
      await withStore(
        step,
        { ...base, envAnswers: () => ({ kind: 'late' }) },
        async (session) => {
          for (const operation of reaching) {
            await runStoreOperation(session, operation).catch(() => undefined);
            if (session.envBoundary?.pending())
              problems.push(
                `${operation.operation} settles before its SDK call did (a floating call)`,
              );
          }
        },
      );
      return problems.length ? problems.join(', ') : undefined;
    }

    case 4: {
      const thrown: unknown[] = [];
      await withStore(
        step,
        { settings: {}, env: ctx.env, initError: (e) => thrown.push(e) },
        async () => undefined,
      ).catch(() => undefined);
      return notReadyProblem(ctx, thrown);
    }

    case 5: {
      const calls = await withStore(step, base, async (session) =>
        session.initCalls(),
      );
      return calls
        ? `init makes ${calls} request(s) or SDK call(s); init stays offline`
        : undefined;
    }

    case 6: {
      const reads = new Set<string>();
      await withStore(step, { ...base, reads }, async (session) => {
        for (const operation of operations)
          await runStoreOperation(session, operation).catch(() => undefined);
      });
      return settingsProblem(ctx, reads);
    }

    case 7: {
      const found: string[] = [];
      for (const envAnswer of [
        { kind: 'pass' } satisfies EnvAnswer,
        {
          kind: 'reject',
          error: new Error(`Request failed: ${CANARY}`),
        } satisfies EnvAnswer,
      ])
        await withStore(
          step,
          { ...base, envAnswers: () => envAnswer },
          async (session) => {
            for (const operation of operations) {
              const planted =
                operation.operation === 'set'
                  ? { ...operation, value: CANARY }
                  : operation;
              const error = await runStoreOperation(session, planted).then(
                () => undefined,
                (thrown: unknown) => thrown,
              );
              if (textOf(error).includes(CANARY))
                found.push('the thrown error message');
            }
            found.push(...leaks(session.logs));
          },
        );
      return found.length
        ? `personal data reaches ${[...new Set(found)].join(', ')}`
        : undefined;
    }
  }
  return undefined;
}

async function storeDeclaredFailures(
  step: StoreStep,
  ctx: Context,
): Promise<Problem> {
  const failures = Object.fromEntries(
    Object.entries(ctx.options.examples).filter(
      ([, example]) => example.outcome?.status === 'failed',
    ),
  );
  if (!Object.keys(failures).length)
    return 'no SDK boundary to fail (pass env) and no failure example (outcome failed)';
  return runExamples('store', step, failures, {
    settings: ctx.options.settings,
  }).then(
    () => undefined,
    (error: unknown) => textOf(error),
  );
}

/* ------------------------------------------------------------------------ */
/* Sources                                                                   */
/* ------------------------------------------------------------------------ */

type SourceStep = Source.Init<Source.TypesGeneric>;

/** Add the canary to every plain object of an input (item 7 for sources). */
function plantCanary(value: unknown, depth = 0): unknown {
  if (depth > 5) return value;
  if (Array.isArray(value))
    return value.map((item) => plantCanary(item, depth + 1));
  if (!isObject(value)) return value;
  const planted: Record<string, unknown> = { kitCanary: CANARY };
  for (const [key, inner] of Object.entries(value))
    planted[key] = plantCanary(inner, depth + 1);
  return planted;
}

function hasCanary(value: unknown): boolean {
  return textOf(value).includes(CANARY);
}

async function sourceItem(
  item: number,
  step: SourceStep,
  ctx: Context,
): Promise<Problem> {
  const { options } = ctx;

  const start = async (setup: Setup) => {
    const thrown: unknown[] = [];
    const session = await openSource(step, {
      ...setup,
      initError: (error) => thrown.push(error),
    }).catch((error: unknown) => {
      thrown.push(error);
      return undefined;
    });
    const initCalls = session?.initCalls() ?? 0;
    const logs = session?.logs ?? [];
    await session?.close();
    return { thrown, initCalls, logs };
  };

  switch (item) {
    case 1: {
      if (!pureJson(options.settings)) return 'settings are not pure JSON';
      const { thrown, logs } = await start({ settings: options.settings });
      if (thrown.length)
        return `does not start without env: ${textOf(thrown[0])}`;
      return errorsIn(logs) ? 'logs an ERROR when it starts' : undefined;
    }

    case 4: {
      const { thrown } = await start({ settings: {}, env: ctx.env });
      return notReadyProblem(ctx, thrown);
    }

    case 5: {
      const { initCalls } = await start({
        settings: options.settings,
        env: ctx.env,
      });
      return initCalls
        ? `init makes ${initCalls} request(s) or SDK call(s); init stays offline`
        : undefined;
    }

    case 6: {
      const reads = new Set<string>();
      await start({ settings: options.settings, env: ctx.env, reads });
      return settingsProblem(ctx, reads);
    }

    case 7: {
      if (!options.createTrigger)
        return 'sources run their examples through the package createTrigger: pass it';
      const found: string[] = [];
      let planted = 0;
      for (const example of Object.values(options.examples)) {
        const input = plantCanary(example.in);
        if (!hasCanary(input)) continue;
        planted++;
        const logs: LogLine[] = [];
        const instance = await options.createTrigger(
          sourceConfig(
            step,
            { env: options.env, settings: options.settings },
            [],
            logs,
          ),
        );
        try {
          await instance
            .trigger(
              example.trigger?.type,
              example.trigger?.options,
            )(input)
            .then(
              (result) => {
                if (hasCanary(isObject(result) ? result.error : undefined))
                  found.push('the answered error');
              },
              (error: unknown) => {
                if (hasCanary(error)) found.push('the thrown error message');
              },
            );
        } finally {
          await instance.flow?.collector.command('shutdown');
        }
        found.push(...leaks(logs));
      }
      if (!planted)
        return 'no example input carries an object to plant the canary in';
      return found.length
        ? `personal data reaches ${[...new Set(found)].join(', ')}`
        : undefined;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------------ */
/* Entry                                                                     */
/* ------------------------------------------------------------------------ */

type KitArgs =
  | ['destination', DestinationStep]
  | ['transformer', TransformerStep]
  | ['store', StoreStep]
  | ['source', SourceStep];

const KIND_PROFILES: Record<KitArgs[0], Profile[]> = {
  destination: ['http', 'sdk-env', 'web-sdk', 'vendor-global', 'socket'],
  transformer: ['transformer'],
  store: ['socket'],
  source: ['source'],
};

type ConformanceArgs =
  | ['destination', DestinationStep, ConformanceOptions]
  | ['transformer', TransformerStep, ConformanceOptions]
  | ['source', SourceStep, ConformanceOptions]
  | ['store', StoreStep, ConformanceOptions];

function kitArgs(args: ConformanceArgs): KitArgs {
  switch (args[0]) {
    case 'destination':
      return ['destination', args[1]];
    case 'transformer':
      return ['transformer', args[1]];
    case 'store':
      return ['store', args[1]];
    case 'source':
      return ['source', args[1]];
  }
}

/**
 * Check a step against the contract. Resolves when every check its profile
 * runs passes; otherwise rejects with one `ConformanceError` listing every
 * failed item. Runs on real timers.
 */
export function conformance<T extends Destination.TypesGeneric>(
  kind: 'destination',
  step: Destination.Instance<T>,
  options: ConformanceOptions,
): Promise<void>;
export function conformance<T extends Transformer.TypesGeneric>(
  kind: 'transformer',
  step: Transformer.Init<T>,
  options: ConformanceOptions,
): Promise<void>;
export function conformance<T extends Source.TypesGeneric>(
  kind: 'source',
  step: Source.Init<T>,
  options: ConformanceOptions,
): Promise<void>;
export function conformance<T extends Store.TypesGeneric>(
  kind: 'store',
  step: Store.Init<T>,
  options: ConformanceOptions,
): Promise<void>;
export async function conformance(...given: ConformanceArgs): Promise<void> {
  const [kind, , options] = given;
  if (timersAreFake())
    throw new Error(
      'conformance runs on real timers: call jest.useRealTimers() first',
    );
  if (!KIND_PROFILES[kind].includes(options.profile))
    throw new Error(
      `profile ${options.profile} is not a ${kind} profile (${KIND_PROFILES[kind].join(', ')})`,
    );

  const args = kitArgs(given);
  const ctx = contextOf(options);
  const items = PROFILE_ITEMS[options.profile].filter(
    (item) =>
      item !== 9 || (args[0] === 'destination' && Boolean(args[1].pushBatch)),
  );
  if (args[0] === 'destination') items.push(11);

  const failures: Array<[number, string]> = [];
  for (const item of items) {
    const problem = await check(args, item, ctx).catch(
      (error: unknown) => `the check threw: ${textOf(error)}`,
    );
    if (problem) failures.push([item, problem]);
  }
  if (failures.length) throw new ConformanceError(failures);
}

function check(args: KitArgs, item: number, ctx: Context): Promise<Problem> {
  switch (args[0]) {
    case 'destination':
      return destinationItem(item, args[1], ctx);
    case 'transformer':
      return transformerItem(item, args[1], ctx);
    case 'store':
      return storeItem(item, args[1], ctx);
    case 'source':
      return sourceItem(item, args[1], ctx);
  }
}
