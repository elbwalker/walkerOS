/**
 * The check-in of `runneros remote`: the body it sends and the answer it
 * reads. The body is the heartbeat's (one definition), without the flow and
 * deployment ids the id-free route does not take, plus the `remote` report.
 */

import {
  isServiceId,
  type CheckInAnswer,
  type RemoteReport,
} from '@walkeros/core';
import {
  heartbeatBody,
  type CounterPayload,
  type DestinationCounter,
} from '../heartbeat.js';
import type { RecentError, RecentLogEntry } from '../log-ring.js';
import { VERSION } from '../version.js';
import { isRecord, jsonOf } from './json.js';

/** The app's caps on one check-in: errors and lines. */
const MAX_ERRORS = 50;
const MAX_LOGS = 50;

const NO_COUNTER: DestinationCounter = {
  count: 0,
  failed: 0,
  duration: 0,
  dlqSize: 0,
  dropped: 0,
};

/**
 * Two counter deltas as one: every delta summed per destination. `dlqSize`
 * is a gauge, so the second payload's (the later child's) is kept, and a
 * destination only the first one names has none left.
 */
export function addCounters(
  a: CounterPayload,
  b: CounterPayload,
): CounterPayload {
  const destinations: Record<string, DestinationCounter> = {};
  const names = new Set([
    ...Object.keys(a.destinations),
    ...Object.keys(b.destinations),
  ]);
  for (const name of names) {
    const first = a.destinations[name] ?? NO_COUNTER;
    const second = b.destinations[name] ?? NO_COUNTER;
    destinations[name] = {
      count: first.count + second.count,
      failed: first.failed + second.failed,
      duration: first.duration + second.duration,
      dlqSize: second.dlqSize,
      dropped: first.dropped + second.dropped,
    };
  }
  return {
    eventsIn: a.eventsIn + b.eventsIn,
    eventsOut: a.eventsOut + b.eventsOut,
    eventsFailed: a.eventsFailed + b.eventsFailed,
    destinations,
  };
}

function isSequence(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

/**
 * The newest sequence of each web part, as the answer names them: every key
 * a deployment id and every value a sequence; else undefined. A key such as
 * `__proto__` stays an own entry.
 */
function servedOf(
  value: Record<string, unknown>,
): Record<string, number> | undefined {
  const served: Array<[string, number]> = [];
  for (const [deployment, sequence] of Object.entries(value)) {
    if (!isServiceId(deployment) || !isSequence(sequence)) return undefined;
    served.push([deployment, sequence]);
  }
  return Object.fromEntries(served);
}

/**
 * The check-in's answer: the deployment's newest released sequence (null for
 * none), the newest sequence of each web part its live version lists, and
 * the interval the app asks for, which the loop takes only within its
 * bounds. Anything else in it is ignored; an answer that does not read
 * throws.
 */
export function readCheckInAnswer(bytes: Uint8Array): CheckInAnswer {
  const answer = jsonOf(bytes);
  if (!isRecord(answer))
    throw new Error('The check-in answer is not a JSON object');
  const { release, intervalMs } = answer;
  if (release !== null && !isSequence(release))
    throw new Error('The check-in answer names no release sequence');
  if (!isRecord(answer.served))
    throw new Error('The check-in answer names no served web parts');
  const served = servedOf(answer.served);
  if (!served)
    throw new Error(
      'The check-in answer names a served web part that is not a deployment id with a sequence',
    );
  return typeof intervalMs === 'number'
    ? { release, intervalMs, served }
    : { release, served };
}

/** The newest errors first, at most the app's cap. */
function newestErrors(errors: readonly RecentError[]): RecentError[] {
  return [...errors]
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, MAX_ERRORS);
}

/** The last lines by time, at most the app's cap. */
function lastLines(logs: readonly RecentLogEntry[]): RecentLogEntry[] {
  return [...logs]
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(-MAX_LOGS);
}

/**
 * One check-in's body. Without the heartbeat it carries the instance, the
 * version, the interval and `remote`; with it, the heartbeat's figures too.
 * Errors and lines may come from the supervisor and its children: they are
 * cut to the app's caps here, the newest errors and the last lines by time.
 */
export function checkInBody(input: {
  instanceId: string;
  intervalMs: number;
  heartbeat: boolean;
  remote: RemoteReport;
  uptimeS: number;
  release?: string;
  counters?: CounterPayload;
  errors: RecentError[];
  logs: RecentLogEntry[];
}): Record<string, unknown> {
  const { instanceId, intervalMs, remote } = input;
  if (!input.heartbeat)
    return { instanceId, cliVersion: VERSION, intervalMs, remote };
  return {
    ...heartbeatBody({
      instanceId,
      release: input.release,
      intervalMs,
      uptimeS: input.uptimeS,
      counters: input.counters,
      errors: newestErrors(input.errors),
      logs: lastLines(input.logs),
    }),
    remote,
  };
}
