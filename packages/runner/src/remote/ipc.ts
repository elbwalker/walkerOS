/**
 * The messages between `runneros remote`'s supervisor and its flow child.
 *
 * The flow child runs release code, and release code can send on the same
 * channel, so each side reads a message only through its guard: every field
 * is checked, and a message that fails is not acted on.
 */

import type { Logger } from '@walkeros/core';
import type { CounterSnapshot, DestinationCounter } from '../heartbeat.js';
import type { RecentError, RecentLogEntry } from '../log-ring.js';
import type { InjectionPlan, SecretRefusal } from '../secret-injection.js';
import { isRecord } from './json.js';

/**
 * What the supervisor tells a new child. The release's walkerOS secret values
 * travel here, never in the fork's environment or arguments, since the
 * child's own check would refuse a delivered name that is already set.
 */
export interface ChildStart {
  type: 'start';
  instanceId: string;
  sequence: number;
  /** The extracted release's `flow.mjs`. */
  flowFile: string;
  /** The per-instance folder: the child's error sink lives there. */
  folder: string;
  port: number;
  /** The release's walkerOS secret values, set before any flow code runs. */
  values: Record<string, string>;
  /**
   * The release's own values the supervisor masks, so the child masks them
   * from its first line. The supervisor's own values (its token) are never
   * among them.
   */
  known: string[];
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
}

export type SupervisorMessage = ChildStart | { type: 'report' };

/**
 * The child's report: raw cumulative counters (the supervisor takes the
 * deltas), and its errors and lines masked and cut as they go on the wire.
 */
export interface ChildReport {
  type: 'report';
  reason: 'asked' | 'new-error';
  counters?: CounterSnapshot;
  release?: string;
  errors: RecentError[];
  logs: RecentLogEntry[];
}

export type ChildMessage =
  | { type: 'format'; format: Logger.Format }
  | { type: 'ready' }
  | { type: 'failed'; message: string; refused?: InjectionPlan['refused'] }
  | ChildReport;

const FORMATS: readonly Logger.Format[] = ['text', 'json'];
const LEVELS: readonly RecentLogEntry['level'][] = [
  'error',
  'warn',
  'info',
  'debug',
];
const REPORT_REASONS: readonly ChildReport['reason'][] = ['asked', 'new-error'];
const SECRET_REFUSALS: readonly SecretRefusal[] = [
  'secret-in-env',
  'secret-reserved',
  'secret-missing',
];

/** `value` is one of `allowed`, compared without widening `allowed`. */
function isOneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return allowed.some((item) => item === value);
}

function isOptional<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
): value is T | undefined {
  return value === undefined || guard(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
  max = Infinity,
): value is T[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every((item) => guard(item))
  );
}

/**
 * The most a child's message may carry, so a forged or runaway message can
 * neither swell the supervisor's memory nor make a check-in body the app
 * refuses: past a bound the message is not acted on. A child sends far less
 * (20 errors, 50 lines, each cut to 256).
 */
const CHILD_STRING_MAX = 1024;
const CHILD_ERRORS_MAX = 50;
const CHILD_LOGS_MAX = 100;
const CHILD_REFUSED_MAX = 64;

function isChildString(value: unknown): value is string {
  return isString(value) && value.length <= CHILD_STRING_MAX;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(isString);
}

function isChildStart(value: Record<string, unknown>): boolean {
  return (
    value.type === 'start' &&
    isString(value.instanceId) &&
    isInteger(value.sequence) &&
    isString(value.flowFile) &&
    isString(value.folder) &&
    isInteger(value.port) &&
    isStringRecord(value.values) &&
    isArrayOf(value.known, isString) &&
    isOptional(value.verbose, isBoolean) &&
    isOptional(value.silent, isBoolean) &&
    isOptional(value.json, isBoolean)
  );
}

export function isSupervisorMessage(
  value: unknown,
): value is SupervisorMessage {
  if (!isRecord(value)) return false;
  return value.type === 'report' || isChildStart(value);
}

function isDestinationCounter(value: unknown): value is DestinationCounter {
  return (
    isRecord(value) &&
    isNumber(value.count) &&
    isNumber(value.failed) &&
    isNumber(value.duration) &&
    isNumber(value.dlqSize) &&
    isNumber(value.dropped)
  );
}

function isCounterSnapshot(value: unknown): value is CounterSnapshot {
  return (
    isRecord(value) &&
    isNumber(value.in) &&
    isNumber(value.out) &&
    isNumber(value.failed) &&
    isRecord(value.destinations) &&
    Object.values(value.destinations).every(isDestinationCounter)
  );
}

function isRecentError(value: unknown): value is RecentError {
  return (
    isRecord(value) &&
    isChildString(value.message) &&
    isNumber(value.count) &&
    isChildString(value.firstSeen) &&
    isChildString(value.lastSeen)
  );
}

function isRecentLogEntry(value: unknown): value is RecentLogEntry {
  return (
    isRecord(value) &&
    isChildString(value.time) &&
    isOneOf(LEVELS, value.level) &&
    isChildString(value.message)
  );
}

function isRefused(value: unknown): value is InjectionPlan['refused'][number] {
  return (
    isRecord(value) &&
    isChildString(value.name) &&
    isOneOf(SECRET_REFUSALS, value.reason)
  );
}

function isRefusedList(value: unknown): value is InjectionPlan['refused'] {
  return isArrayOf(value, isRefused, CHILD_REFUSED_MAX);
}

export function isChildMessage(value: unknown): value is ChildMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'format':
      return isOneOf(FORMATS, value.format);
    case 'ready':
      return true;
    case 'failed':
      return (
        isChildString(value.message) && isOptional(value.refused, isRefusedList)
      );
    case 'report':
      return (
        isOneOf(REPORT_REASONS, value.reason) &&
        isOptional(value.counters, isCounterSnapshot) &&
        isOptional(value.release, isChildString) &&
        isArrayOf(value.errors, isRecentError, CHILD_ERRORS_MAX) &&
        isArrayOf(value.logs, isRecentLogEntry, CHILD_LOGS_MAX)
      );
    default:
      return false;
  }
}
