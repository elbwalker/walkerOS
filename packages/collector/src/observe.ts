/**
 * The Observe reporter: usage reports of this runtime's counters and issues,
 * and preview rows per event and per destination outcome, posted as NDJSON
 * with a Bearer token. It is never awaited on the event path and never
 * throws: a failing report is one ERROR line a minute and changes nothing
 * for delivery. Started by `startFlow` behind `__WALKEROS_OBSERVE__`.
 */
import type {
  BatchedPoster,
  Collector,
  Destination,
  FlowState,
  PostResult,
  WalkerOS,
} from '@walkeros/core';
import {
  createBatchedPoster,
  getErrorMessage,
  getSpanId,
  isObject,
  LATENCY_BOUNDS_MS,
  redactLine,
  reportCause,
} from '@walkeros/core';
import { sanitizeArgs } from './sanitizeArgs';
import { unrefTimer } from './timers';

/** Seconds between usage reports when the options name none. */
const DEFAULT_INTERVAL_S = 60;
const MIN_INTERVAL_S = 10;
const MAX_INTERVAL_S = 300;
/** A new issue is reported this soon, once per burst of new causes. */
const ISSUE_REPORT_MS = 1000;
/** The longest the last report may hold up a shutdown. */
const FINAL_TIMEOUT_MS = 3000;
/** Preview rows wait at most this long, or until this many wait. */
const PREVIEW_BATCH_MS = 2000;
const PREVIEW_BATCH_SIZE = 100;
const PREVIEW_MAX_BUFFERED = 500;
/** Pushes still in flight that a page leave reports, oldest dropped first. */
const PREVIEW_MAX_PENDING = 100;

const OBSERVE_KEYS = ['usage', 'preview'];
const USAGE_KEYS = ['url', 'token', 'interval'];
const PREVIEW_KEYS = ['url', 'token'];

/** One row of a usage report: exactly the columns of the `usage` table. */
interface UsageRow {
  instance: string;
  seq: number;
  final: number;
  interval_s: number;
  release: string;
  part: string;
  step: string;
  metric: string;
  name: string;
  is_gauge: number;
  value: number;
  code: string;
  status: number;
  retryable: number;
  message: string;
  reported_at: string;
}

/** One preview row: exactly the columns of the `preview` table. */
interface PreviewRow {
  instance: string;
  seq: number;
  release: string;
  part: string;
  kind: 'event' | 'outcome';
  event_id: string;
  trace_id: string;
  name: string;
  source: string;
  timestamp: string;
  outcome: string;
  outcomes: string;
  payload: string;
  reported_at: string;
}

/** One element of a preview row's `outcomes`. */
interface Outcome {
  destination: string;
  phase: string;
  outcome: string;
  code: string;
  status: number;
  message: string;
  mapping_key: string;
  ms: number;
}

interface Part {
  url: string;
  token: string;
}

interface Parts {
  usage?: Part & { interval: number };
  preview?: Part;
}

/** Masks a message the reporter posts: known values, then the patterns, then the 256 cut. */
type Mask = (text: string) => string;

/**
 * Starts the reporter for the parts the options hold. A part that fails its
 * check logs one ERROR line naming the key and does no work; with no part
 * left, nothing runs and no reporter is returned.
 */
export function startObserve(
  collector: Collector.Instance,
  options: Collector.Observe,
): Collector.Reporter | undefined {
  // A host's mask can throw; then the message goes empty rather than
  // unmasked.
  const mask: Mask = (text) => {
    try {
      return redactLine(collector.logger.mask(text));
    } catch {
      return '';
    }
  };
  const parts = checkParts(collector, options, mask);
  if (!parts.usage && !parts.preview) return undefined;

  const identity = {
    instance: getSpanId(),
    release: collector.release ?? '',
    part: collector.name ?? 'default',
  };
  const usage =
    parts.usage && startUsage(collector, parts.usage, identity, mask);
  const preview =
    parts.preview && startPreview(collector, parts.preview, identity, mask);

  return {
    flush: (keepalive) => (preview ? preview.flush(keepalive) : resolved()),
    stop: () =>
      within(
        Promise.all([usage?.stop(), preview?.stop()]).then(noop),
        FINAL_TIMEOUT_MS,
      ),
  };
}

// ── Options ──────────────────────────────────────────────────────────────────

/** The parts that pass their check; one ERROR line for each that does not. */
function checkParts(
  collector: Collector.Instance,
  options: unknown,
  mask: Mask,
): Parts {
  const refuse = (path: string, problem: string, part: string): Parts => {
    collector.logger.error(
      `Invalid observe option at ${path}: ${problem}; ${part} not started`,
    );
    return {};
  };
  if (!isObject(options)) return refuse('observe', 'not an object', 'observe');
  const unknown = Object.keys(options).find(
    (key) => !OBSERVE_KEYS.includes(key),
  );
  if (unknown !== undefined)
    return refuse(`observe.${unknown}`, 'not an observe option', 'observe');

  const parts: Parts = {};
  if (options.usage !== undefined) {
    const usage = checkPart(options.usage, 'usage', USAGE_KEYS, mask);
    if (typeof usage === 'string') refuse(...splitProblem(usage), 'usage');
    else {
      const interval = isObject(options.usage)
        ? options.usage.interval
        : undefined;
      if (
        interval !== undefined &&
        (typeof interval !== 'number' ||
          !Number.isInteger(interval) ||
          interval < MIN_INTERVAL_S ||
          interval > MAX_INTERVAL_S)
      )
        refuse(
          'observe.usage.interval',
          `${show(interval, mask)} is not a whole number of seconds from ${MIN_INTERVAL_S} to ${MAX_INTERVAL_S}`,
          'usage',
        );
      else
        parts.usage = {
          ...usage,
          interval:
            typeof interval === 'number' ? interval : DEFAULT_INTERVAL_S,
        };
    }
  }
  if (options.preview !== undefined) {
    const preview = checkPart(options.preview, 'preview', PREVIEW_KEYS, mask);
    if (typeof preview === 'string')
      refuse(...splitProblem(preview), 'preview');
    else parts.preview = preview;
  }
  return parts;
}

/** A part's url and token, or `<path>\u0000<problem>` naming what fails. */
function checkPart(
  value: unknown,
  name: string,
  keys: string[],
  mask: Mask,
): Part | string {
  const path = `observe.${name}`;
  if (!isObject(value)) return `${path}\u0000not an object`;
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown !== undefined)
    return `${path}.${unknown}\u0000not an option of ${name}`;
  const { url, token } = value;
  if (typeof url !== 'string' || !isHttpUrl(url))
    return `${path}.url\u0000${show(url, mask)} is not an http or https URL`;
  // The token's value is never shown: it is the one secret of the part.
  if (typeof token !== 'string' || token === '')
    return `${path}.token\u0000not a non-empty string`;
  return { url, token };
}

function splitProblem(problem: string): [string, string] {
  const [path = '', text = ''] = problem.split('\u0000');
  return [path, text];
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** A value as written, masked like any text the reporter shows. */
function show(value: unknown, mask: Mask): string {
  if (value === undefined) return 'nothing';
  try {
    return mask(JSON.stringify(value) ?? String(value));
  } catch {
    return mask(String(value));
  }
}

// ── Usage ────────────────────────────────────────────────────────────────────

interface Identity {
  instance: string;
  release: string;
  part: string;
}

function startUsage(
  collector: Collector.Instance,
  options: Part & { interval: number },
  identity: Identity,
  mask: Mask,
): { stop(): Promise<void> } {
  const poster: BatchedPoster<UsageRow> = createBatchedPoster<UsageRow>({
    url: options.url,
    token: options.token,
  });
  let seq = 0;
  let current: Promise<void> | undefined;
  let lastSuccess: number | undefined;
  let soon: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  // One report at a time: a beat that finds one in flight is skipped, and the
  // next cumulative report covers it.
  const report = (final: boolean, timeoutMs?: number): Promise<void> => {
    const run = (async () => {
      seq += 1;
      let rows: UsageRow[];
      try {
        rows = usageRows(
          collector,
          {
            ...identity,
            seq,
            final: final ? 1 : 0,
            interval_s: options.interval,
            reported_at: clickhouseTime(Date.now()),
          },
          mask,
        );
      } catch (error) {
        // A report that cannot be built is a failed report, not a silent one.
        reportFailure(
          collector,
          'usage',
          { ok: false, message: `report not built: ${getErrorMessage(error)}` },
          lastSuccess,
        );
        return;
      }
      const result = await poster.send(
        rows,
        timeoutMs === undefined ? undefined : { timeoutMs },
      );
      if (result.ok) lastSuccess = Date.now();
      else reportFailure(collector, 'usage', result, lastSuccess);
    })().catch(noop);
    current = run;
    void run.then(() => {
      if (current === run) current = undefined;
    });
    return run;
  };

  const beat = (): void => {
    if (stopped || current) return;
    void report(false);
  };

  void report(false);
  const timer = setInterval(beat, options.interval * 1000);
  unrefTimer(timer);

  // A new cause is reported soon, not at the next beat; with a report in
  // flight, right after it. The listener only schedules: it runs inside the
  // collector's failure handling. The reporter's own failures wait for the
  // next beat.
  collector.causeLog?.setListener((key) => {
    if (soon !== undefined || key.step.startsWith('observe.')) return;
    soon = setTimeout(() => {
      soon = undefined;
      if (current) void current.then(beat);
      else beat();
    }, ISSUE_REPORT_MS);
    unrefTimer(soon);
  });

  return {
    // One deadline for the whole stop: a report in flight is awaited only
    // until then, and the final report takes what is left as its own
    // timeout, so its request is aborted at the deadline. Without time left
    // there is no final, and nothing starts after the deadline. A regular
    // report already in flight keeps its request up to its own 10 s timeout:
    // a host that ends without process.exit stays alive until it settles.
    async stop() {
      stopped = true;
      clearInterval(timer);
      if (soon !== undefined) clearTimeout(soon);
      collector.causeLog?.setListener(noop);
      const deadline = Date.now() + FINAL_TIMEOUT_MS;
      if (current) await within(current, deadline - Date.now());
      const left = deadline - Date.now();
      if (left > 0) await report(true, left);
    },
  };
}

/** Base columns every row of one report shares. */
type ReportBase = Pick<
  UsageRow,
  | 'instance'
  | 'seq'
  | 'final'
  | 'interval_s'
  | 'release'
  | 'part'
  | 'reported_at'
>;

/**
 * The rows of one report. Counters count since the collector started; a
 * counter at 0 is left out, except `collector.in`, which marks every report.
 * Gauges go in every report, zero included, and so does every held issue.
 */
function usageRows(
  collector: Collector.Instance,
  base: ReportBase,
  mask: Mask,
): UsageRow[] {
  const rows: UsageRow[] = [];
  const add = (
    step: string,
    metric: string,
    value: number,
    gauge = false,
    issue?: Pick<UsageRow, 'code' | 'status' | 'retryable' | 'message'>,
  ): void => {
    rows.push({
      ...base,
      step,
      metric,
      name: '',
      is_gauge: gauge ? 1 : 0,
      value: Math.round(value),
      code: issue?.code ?? '',
      status: issue?.status ?? 0,
      retryable: issue?.retryable ?? 0,
      message: issue?.message ?? '',
    });
  };
  const count = (step: string, metric: string, value: number | undefined) => {
    if (value) add(step, metric, value);
  };

  const { status } = collector;
  add('collector', 'in', status.in);
  count('collector', 'out', status.out);
  count('collector', 'failed', status.failed);

  for (const [at, dropped] of Object.entries(status.dropped)) {
    count(at, 'dropped_consent', dropped.consent);
    count(at, 'dropped_ignored', dropped.ignored);
    count(at, 'dropped_stopped', dropped.stopped);
    count(at, 'dropped_queue', dropped.queue);
    count(at, 'dropped_dlq', dropped.dlq);
  }

  for (const [id, source] of Object.entries(status.sources)) {
    count(`source.${id}`, 'count', source.count);
    count(`source.${id}`, 'rejected', source.rejected);
  }

  for (const [id, destination] of Object.entries(status.destinations)) {
    const step = `destination.${id}`;
    count(step, 'delivered', destination.count);
    count(step, 'failed', destination.failed);
    count(step, 'skipped_consent', destination.skipped);
    count(step, 'skipped_ignored', destination.ignored);
    count(step, 'duration_ms', destination.duration);
    (destination.latency ?? []).forEach((value, index) =>
      count(
        step,
        `latency_ms_le_${index < LATENCY_BOUNDS_MS.length ? LATENCY_BOUNDS_MS[index] : 'inf'}`,
        value,
      ),
    );
  }

  // A destination's status is kept under its `config.id` when it sets one,
  // so its gauges name the same step as its counters.
  for (const [key, destination] of Object.entries(collector.destinations)) {
    const id = destination.config.id || key;
    const step = `destination.${id}`;
    add(step, 'queue', destination.queuePush?.length ?? 0, true);
    add(step, 'dlq', destination.dlq?.length ?? 0, true);
    add(step, 'in_flight', status.destinations[id]?.inFlightBatch ?? 0, true);
  }

  for (const [step, breaker] of Object.entries(status.breakers))
    add(step, 'breaker_open', breaker.state === 'closed' ? 0 : 1, true);

  for (const [step, errors] of Object.entries(status.connectionErrors))
    count(step, 'connection_errors', errors);

  for (const issue of collector.causeLog?.snapshot().keys ?? [])
    add(issue.key.step, 'issue', issue.count, false, {
      code: issue.key.code,
      status: issue.key.status ?? 0,
      retryable: issue.retryable ? 1 : 0,
      message: mask(issue.message),
    });

  return rows;
}

/** A failed report as one ERROR line a minute, through the cause log. */
function reportFailure(
  collector: Collector.Instance,
  route: 'usage' | 'preview',
  result: Extract<PostResult, { ok: false }>,
  lastSuccess: number | undefined,
): void {
  const code = result.code ? `, code ${result.code}` : '';
  const since = lastSuccess ? clickhouseTime(lastSuccess) : 'never';
  reportCause(
    collector,
    collector.logger,
    { step: `observe.${route}`, code: 'report-failed', status: result.status },
    `Observe ${route} report failed`,
    { error: `${result.message}${code}, last success ${since}` },
  );
}

// ── Preview ──────────────────────────────────────────────────────────────────

function startPreview(
  collector: Collector.Instance,
  options: Part,
  identity: Identity,
  mask: Mask,
): { flush(keepalive?: boolean): Promise<void>; stop(): Promise<void> } {
  let lastSuccess: number | undefined;
  const poster: BatchedPoster<PreviewRow> = createBatchedPoster<PreviewRow>({
    url: options.url,
    token: options.token,
    batchMs: PREVIEW_BATCH_MS,
    batchSize: PREVIEW_BATCH_SIZE,
    maxBuffered: PREVIEW_MAX_BUFFERED,
    onResult: (result, { keepalive }) => {
      if (result.ok) {
        lastSuccess = Date.now();
        return;
      }
      // A page leave's request outlives the page while the page's own
      // promise rejects as it unloads: without a status nothing says the
      // ingest refused it.
      if (keepalive && result.status === undefined) return;
      reportFailure(collector, 'preview', result, lastSuccess);
    },
  });
  let seq = 0;
  // Pushes that have entered and not settled, by event id. A page that
  // leaves before a push settles never makes its row (the document is gone
  // before the destination answers), so a page-leave flush reports each as
  // queued first.
  const pending = new Map<string, FlowState>();

  // `seq` is taken before the row is built, so a row that fails to build
  // leaves a gap, the one sign of loss the read can see.
  const post = (build: () => RecordColumns | undefined): void => {
    seq += 1;
    const rowSeq = seq;
    try {
      const row = build();
      if (!row) return;
      poster.push({
        ...identity,
        seq: rowSeq,
        reported_at: clickhouseTime(Date.now()),
        ...row,
      });
    } catch {
      // The row is lost; its seq stays taken.
    }
  };

  const observer = (state: FlowState): void => {
    if (state.stepId === 'collector.push') {
      if (state.phase === 'in') {
        if (pending.size >= PREVIEW_MAX_PENDING) {
          const oldest = pending.keys().next();
          if (!oldest.done) pending.delete(oldest.value);
        }
        pending.set(state.eventId, state);
        return;
      }
      pending.delete(state.eventId);
    }
    if (!makesRow(state)) return;
    post(() => previewRow(state, mask, collector));
  };
  collector.observers.add(observer);

  return {
    // The settled row of a reported push, if the page lives on, takes a
    // higher seq and wins in the read. The map is cleared, so the second
    // hide signal of one departure adds no row.
    flush: (keepalive) => {
      if (keepalive) {
        const leaving = [...pending.values()];
        pending.clear();
        const now = Date.now();
        for (const state of leaving) post(() => leavingRow(state, now, mask));
      }
      return poster.flush(keepalive);
    },
    async stop() {
      collector.observers.delete(observer);
      await poster.flush();
    },
  };
}

/** The columns a record decides; the reporter adds the rest. */
type RecordColumns = Omit<
  PreviewRow,
  'instance' | 'seq' | 'release' | 'part' | 'reported_at'
>;

/**
 * Whether a record makes a row: the `collector.push` out, error and skip
 * records, and a destination's out, flush, error and skip records of an
 * event (an init failure has none).
 */
function makesRow(state: FlowState): boolean {
  const { phase } = state;
  if (state.stepId === 'collector.push')
    return phase === 'out' || phase === 'error' || phase === 'skip';
  if (state.stepType !== 'destination' || !state.eventId) return false;
  return (
    phase === 'out' ||
    phase === 'flush' ||
    phase === 'error' ||
    phase === 'skip'
  );
}

/**
 * The row a record makes: an event row from the `collector.push` records, an
 * outcome row from a destination's. Stateless: the read merges per event,
 * and a later outcome of a destination wins.
 */
function previewRow(
  state: FlowState,
  mask: Mask,
  collector: Collector.Instance,
): RecordColumns | undefined {
  // Read at the record: before `walker run` a push is held, to be replayed
  // by run under the same event id.
  if (state.stepId === 'collector.push')
    return eventRow(state, mask, !collector.allowed);
  return outcomeRow(state, mask, collector.config.consentDenied);
}

function eventRow(
  state: FlowState,
  mask: Mask,
  beforeRun: boolean,
): RecordColumns | undefined {
  const base = {
    kind: 'event' as const,
    event_id: state.eventId,
    trace_id: state.traceId ?? '',
    timestamp: clickhouseTime(Date.parse(state.timestamp)),
  };
  const ms = Math.round(state.durationMs ?? 0);

  if (state.phase === 'out') {
    const result = state.outEvent;
    if (!isPushResult(result)) return undefined;
    const event = result.event;
    // A held push answers ok with no destination: it is waiting for run, not
    // skipped. A push refused before run stays failed.
    const held = beforeRun && result.ok && !anyRefs(result);
    return {
      ...base,
      name: event?.name ?? '',
      source: sourceOf(state, event),
      // The event's own time where the column can hold it; a time in
      // micro- or nanoseconds would cost the whole body.
      ...(event &&
        inTimeRange(event.timestamp) && {
          timestamp: clickhouseTime(event.timestamp),
        }),
      outcome: held ? 'queued' : pushOutcome(result),
      outcomes: JSON.stringify(
        held
          ? [
              collectorOutcome(
                'out',
                'queued',
                { code: 'run', status: 0, message: '' },
                ms,
                mask,
              ),
            ]
          : pushOutcomes(result, ms, mask),
      ),
      payload: event ? payloadOf(event) : '',
    };
  }

  // The error and skip records hold no event, so no name.
  const failed = state.phase === 'error';
  return {
    ...base,
    name: '',
    source: state.sourceId ?? '',
    outcome: failed ? 'failed' : 'skipped',
    outcomes: JSON.stringify([
      collectorOutcome(
        state.phase,
        failed ? 'failed' : 'skipped',
        {
          code: failed ? (state.error?.code ?? '') : (state.skipReason ?? ''),
          status: state.error?.status ?? 0,
          message: failed
            ? (state.error?.message ?? '')
            : typeof state.meta?.at === 'string'
              ? `at ${state.meta.at}`
              : '',
        },
        ms,
        mask,
      ),
    ]),
    payload: '',
  };
}

/**
 * What became of an event at one destination, from one of its records. An
 * `out` of a batched destination only enqueued the event, and a consent skip
 * holds it when consent-denied events are queued: both wait.
 */
function outcomeRow(
  state: FlowState,
  mask: Mask,
  consentDenied: Collector.Config['consentDenied'],
): RecordColumns {
  const { phase } = state;
  let outcome = 'done';
  let code = '';
  if (phase === 'error') {
    outcome = 'failed';
    code = state.error?.code ?? '';
  } else if (phase === 'skip') {
    const held = state.skipReason === 'consent' && consentDenied !== 'skip';
    outcome = held ? 'queued' : 'skipped';
    code = state.skipReason ?? '';
  } else if (phase === 'out' && state.batch) {
    outcome = 'queued';
    code = 'batch';
  }
  const element: Outcome = {
    destination: state.stepId.slice('destination.'.length),
    phase,
    outcome,
    code,
    status: state.error?.status ?? 0,
    message: mask(state.error?.message ?? ''),
    mapping_key: state.mappingKey ?? '',
    ms: Math.round(state.durationMs ?? 0),
  };
  return {
    kind: 'outcome',
    event_id: state.eventId,
    trace_id: state.traceId ?? '',
    name: '',
    source: state.sourceId ?? '',
    timestamp: clickhouseTime(Date.parse(state.timestamp)),
    outcome,
    outcomes: JSON.stringify([element]),
    payload: '',
  };
}

/**
 * The element of the collector itself (`destination: ''`): a drop, an
 * error, or a push that failed before any destination.
 */
function collectorOutcome(
  phase: string,
  outcome: string,
  reason: { code: string; status: number; message: string },
  ms: number,
  mask: Mask,
): Outcome {
  return {
    destination: '',
    phase,
    outcome,
    code: reason.code,
    status: reason.status,
    message: mask(reason.message),
    mapping_key: '',
    ms,
  };
}

/**
 * Each destination a push result names, with what became of the event there;
 * a failed push that names no failed destination carries the collector's
 * reason instead.
 */
function pushOutcomes(
  result: PushResultShape,
  ms: number,
  mask: Mask,
): Outcome[] {
  const outcomes: Outcome[] = [];
  const groups: Array<[string, RefMap | undefined]> = [
    ['done', result.done],
    ['queued', result.queued],
    ['failed', result.failed],
  ];
  for (const [outcome, refs] of groups)
    for (const [destination, ref] of Object.entries(refs ?? {})) {
      const reason = ref.reason;
      outcomes.push({
        destination,
        phase: 'out',
        outcome,
        code: reason?.code ?? '',
        status: reason && 'status' in reason ? (reason.status ?? 0) : 0,
        message: mask(reason?.message ?? ''),
        mapping_key: '',
        ms,
      });
    }
  if (!result.ok && !hasRefs(result.failed))
    outcomes.push(
      collectorOutcome(
        'out',
        'failed',
        {
          code: result.reason?.code ?? '',
          status: result.reason?.status ?? 0,
          message: result.reason?.message ?? result.error ?? '',
        },
        ms,
        mask,
      ),
    );
  return outcomes;
}

type RefMap = Record<string, Destination.Ref>;

type PushResultShape = {
  ok: boolean;
  event?: WalkerOS.Event;
  dropped?: boolean;
  done?: RefMap;
  queued?: RefMap;
  failed?: RefMap;
  error?: string;
  reason?: { code: string; message: string; status?: number };
};

function hasRefs(refs: RefMap | undefined): boolean {
  return Object.keys(refs ?? {}).length > 0;
}

function anyRefs(result: PushResultShape): boolean {
  return (
    hasRefs(result.done) || hasRefs(result.queued) || hasRefs(result.failed)
  );
}

/** The event's state: an event that reached no destination was skipped. */
function pushOutcome(result: PushResultShape): string {
  if (hasRefs(result.failed)) return 'failed';
  if (hasRefs(result.queued)) return 'queued';
  if (!result.ok) return 'failed';
  if (result.dropped || !hasRefs(result.done)) return 'skipped';
  return 'done';
}

function isPushResult(value: unknown): value is PushResultShape {
  return isObject(value) && typeof value.ok === 'boolean';
}

function sourceOf(state: FlowState, event: WalkerOS.Event | undefined): string {
  if (state.sourceId) return state.sourceId;
  return typeof event?.source?.type === 'string' ? event.source.type : '';
}

/**
 * The event row of a push still in flight as the page leaves, from its `in`
 * record: queued, since the page cannot learn the end, with the collector's
 * element naming the leave. No payload: the `in` record holds the event as
 * the source pushed it, before the flow's own steps (the source's mapping,
 * its consent gate, `source.next`) ran, so a redaction would be skipped. A
 * settled row, if the page lives on, brings the processed event.
 */
function leavingRow(state: FlowState, now: number, mask: Mask): RecordColumns {
  const event = isObject(state.inEvent) ? state.inEvent : undefined;
  const at = Date.parse(state.timestamp);
  const source = isObject(event?.source) ? event.source.type : undefined;
  const time = event?.timestamp;
  return {
    kind: 'event',
    event_id: state.eventId,
    trace_id: state.traceId ?? '',
    name: typeof event?.name === 'string' ? event.name : '',
    source: state.sourceId ?? (typeof source === 'string' ? source : ''),
    timestamp: clickhouseTime(
      typeof time === 'number' && inTimeRange(time) ? time : at,
    ),
    outcome: 'queued',
    outcomes: JSON.stringify([
      collectorOutcome(
        'in',
        'queued',
        { code: 'page-leave', status: 0, message: '' },
        Math.max(0, Math.round(now - at)),
        mask,
      ),
    ]),
    payload: '',
  };
}

/** The event once, as JSON a cycle or a BigInt cannot break. */
function payloadOf(event: WalkerOS.Event): string {
  try {
    return JSON.stringify(sanitizeArgs([event])[0]) ?? '';
  } catch {
    return '';
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** The range `DateTime64(3)` holds: 1900-01-01 to 2299-12-31, UTC. */
const MIN_TIME_MS = -2_208_988_800_000;
const MAX_TIME_MS = 10_413_791_999_999;

function inTimeRange(ms: number): boolean {
  return Number.isFinite(ms) && ms >= MIN_TIME_MS && ms <= MAX_TIME_MS;
}

/**
 * A time as ClickHouse's `DateTime64(3)` reads it, `YYYY-MM-DD hh:mm:ss.SSS`
 * UTC; a time outside its range reads as now.
 */
function clickhouseTime(ms: number): string {
  const at = inTimeRange(ms) ? ms : Date.now();
  return new Date(at).toISOString().replace('T', ' ').slice(0, 23);
}

/** Resolves when the work settles or the time is up, whichever comes first. */
function within(work: Promise<void>, ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    unrefTimer(timer);
    work.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

function resolved(): Promise<void> {
  return Promise.resolve();
}

function noop(): void {}
