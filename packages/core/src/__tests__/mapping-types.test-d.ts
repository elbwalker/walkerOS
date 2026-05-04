import type { Mapping, WalkerOS, Collector, Logger } from '../types';

declare const collectorInstance: Collector.Instance;
declare const loggerInstance: Logger.Instance;

// Context fields are all required except consent.
const ctx: Mapping.Context = {
  event: { name: 'page view' } as WalkerOS.DeepPartialEvent,
  mapping: { key: 'data.x' },
  collector: collectorInstance,
  logger: loggerInstance,
  consent: { marketing: true },
};
void ctx;

// New unified shapes compile.
const fn: Mapping.Fn = (value, context) =>
  `${String(value)}:${context.event.name ?? ''}`;
const cond: Mapping.Condition = (value, context) =>
  Boolean(context.consent?.marketing);
const val: Mapping.Validate = (value, context) =>
  typeof value === 'string' && Boolean(context.event);
void fn;
void cond;
void val;

// Old positional shapes must NOT compile.
// @ts-expect-error - old 3-arg fn signature removed
const oldFn: Mapping.Fn = (value, mapping, options) => value;
void oldFn;
// @ts-expect-error - old 3-arg condition signature removed
const oldCond: Mapping.Condition = (value, mapping, collector) => true;
void oldCond;
// @ts-expect-error - Mapping.Options no longer exists
type _NoOptions = Mapping.Options;

// collector and logger are required, not optional.
// @ts-expect-error - missing required collector
const ctxNoCollector: Mapping.Context = {
  event: {} as WalkerOS.DeepPartialEvent,
  mapping: {},
  logger: loggerInstance,
};
void ctxNoCollector;
// @ts-expect-error - missing required logger
const ctxNoLogger: Mapping.Context = {
  event: {} as WalkerOS.DeepPartialEvent,
  mapping: {},
  collector: collectorInstance,
};
void ctxNoLogger;

// Note: cannot statically reject `(value) => boolean` as a Validate, because
// TS function arity is contravariant: a shorter signature is assignable to a
// longer one. Author convention: declare two args anyway.
