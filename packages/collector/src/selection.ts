import type {
  Collector,
  Destination,
  FailureReason,
  Mapping,
  WalkerOS,
} from '@walkeros/core';
import {
  FatalError,
  checkConsent,
  getMappingCandidates,
  getRequiredConsent,
  isThenable,
  matchMappingRule,
  reportCause,
  stepId,
} from '@walkeros/core';
import { recordFailure } from './outcome';
import { resolveDestinationTimeout, withTimeout } from './timeout';

/** One destination pass: who selects, which entries failed, and who answers for them. */
export interface SelectPass {
  collector: Collector.Instance;
  destination: Destination.Instance;
  id: string;
  /** Entries whose selection failed in this pass: never selected or admitted again in it. */
  failed: Set<Destination.Queued>;
  /** Called once per failed entry after its failure was recorded: the push waiting for it answers. */
  onFailed: (
    entry: Destination.Queued,
    reason: FailureReason,
    error: unknown,
  ) => void;
}

const noop = (): void => {};

/** Held only while an in-place selection awaits; the stored promise never rejects. */
const entering = new WeakMap<Destination.Instance, Promise<void>>();

/** The entry's rule under the current rules; `undefined`: not selected, or the rules were replaced. */
export function currentMatch(
  entry: Destination.Queued,
  config: Destination.Config,
): Mapping.Result | undefined {
  if (!config.mapping) return {};
  const { match } = entry;
  return match && match.rules === config.mapping ? match.result : undefined;
}

function isPending(
  result: WalkerOS.PromiseOrValue<Mapping.Result>,
): result is Promise<Mapping.Result> {
  return isThenable(result);
}

/**
 * Fails an entry whose selection threw, rejected or timed out, once, while
 * the pass owns it: a queued entry must still be queued (drop-oldest and
 * `walker run` already answered for it); the arriving entry and entries in
 * the pass's hand are its own. A FatalError propagates. Breaker-neutral: a
 * condition never reaches the vendor.
 */
export function failSelection(
  pass: SelectPass,
  entry: Destination.Queued,
  queued: boolean,
  err: unknown,
): void {
  if (err instanceof FatalError) throw err;
  if (queued) {
    const queue = pass.destination.queuePush ?? [];
    const at = queue.indexOf(entry);
    if (at < 0) return;
    queue.splice(at, 1);
  }
  pass.failed.add(entry);
  const reason = recordFailure(
    pass.collector,
    pass.destination,
    pass.id,
    [entry.event],
    err,
    { breaker: false, message: 'rule selection failed' },
  );
  pass.onFailed(entry, reason, err);
}

/**
 * The only rule selection at a destination. Selects each entry the
 * destination admits and that has no current match: `waiting` (queued, or in
 * the pass's hand) and `arriving`, each admitted with its own event consent
 * over the collector's (the callers refresh queued entries first). Only a
 * FatalError escapes, after the selections already pending. Returns a
 * promise only when a condition was async.
 */
export function selectRules(
  pass: SelectPass,
  waiting: Destination.Queued[],
  queued: boolean,
  arriving?: Destination.Queued,
): Promise<void> | undefined {
  const { collector, destination } = pass;
  const { config } = destination;
  const rules = config.mapping;
  if (!rules) return;

  const required = getRequiredConsent(config);
  const pending: Promise<void>[] = [];
  // A FatalError thrown synchronously ends the round; it escapes after the
  // selections already pending, so none of them is left without a handler.
  let fatal: FatalError | undefined;
  const select = (entry: Destination.Queued, inQueue: boolean): void => {
    if (
      fatal ||
      pass.failed.has(entry) ||
      currentMatch(entry, config) !== undefined
    )
      return;
    if (
      'unmet' in checkConsent(required, collector.consent, entry.event.consent)
    )
      return;
    let result: WalkerOS.PromiseOrValue<Mapping.Result>;
    try {
      result = matchMappingRule(entry.event, rules, collector);
    } catch (err) {
      if (err instanceof FatalError) {
        fatal = err;
        return;
      }
      failSelection(pass, entry, inQueue, err);
      return;
    }
    if (!isPending(result)) {
      entry.match = { rules, result };
      return;
    }
    // A match is written only from the timed race, never from a late resolution.
    const ms = resolveDestinationTimeout(config.timeout);
    pending.push(
      withTimeout(
        result,
        ms,
        `rule condition did not settle within ${ms}ms`,
      ).then(
        (settled) => {
          entry.match = { rules, result: settled };
        },
        (err: unknown) => failSelection(pass, entry, inQueue, err),
      ),
    );
  };

  for (const entry of waiting) select(entry, queued);
  if (arriving) select(arriving, false);
  if (fatal) {
    const thrown = fatal;
    if (!pending.length) throw thrown;
    const rethrow = (): never => {
      throw thrown;
    };
    return Promise.all(pending).then(rethrow, rethrow);
  }
  return pending.length ? Promise.all(pending).then(noop) : undefined;
}

/**
 * One selection round behind the destination's guard: a promise to await
 * while the guard is held or a selection awaits, `undefined` when the round
 * finished synchronously. Callers loop at the call site and drain in the same
 * turn as the last call. The guard holds `done.then(noop, noop)`, registered
 * before the owner awaits `done`, so the owner resumes, releases and drains
 * before any waiter.
 */
export function selectRound(
  pass: SelectPass,
  list: () => Destination.Queued[],
  queued: boolean,
  arriving?: Destination.Queued,
): Promise<void> | undefined {
  const busy = entering.get(pass.destination);
  if (busy) return busy;
  if (!pass.destination.config.mapping) return;
  const pending = selectRules(pass, list(), queued, arriving);
  if (!pending) return;
  const release = (): void => {
    entering.delete(pass.destination);
  };
  const done = pending.then(release, (err: unknown) => {
    release();
    throw err;
  });
  entering.set(pass.destination, done.then(noop, noop));
  return done;
}

/**
 * A `before` child renamed onto another existing rule: that rule and its
 * consent do not apply. Compared with the rule actually selected (the carried
 * key, `''` for none), never a fresh lookup of the entry name. ERROR through
 * the cause log, rate-limited per destination and code; nothing when the new
 * name has no rule or resolves to the carried key.
 */
export function reportRuleNotApplied(
  pass: SelectPass,
  selectedKey: string,
  to: string,
): void {
  const rules = pass.destination.config.mapping;
  if (!rules) return;
  const toKey = getMappingCandidates(to, rules)[0]?.key;
  if (!toKey || toKey === selectedKey) return;
  reportCause(
    pass.collector,
    pass.collector.logger,
    { step: stepId('destination', pass.id), code: 'rule-not-applied' },
    `before chain renamed an event to "${to}": rule "${toKey}" and its consent do not apply; a destination selects its rule as the event enters it ("${selectedKey || 'no rule'}" applied)`,
    {
      type: pass.destination.type,
      ...(selectedKey ? { mappingKey: selectedKey } : {}),
    },
  );
}
