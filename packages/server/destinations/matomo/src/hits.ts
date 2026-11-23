import type {
  Collector,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import type { Hit, Rule, Settings } from './types';
import type { MethodName } from './methods';
import { getMappingValue, isArray } from '@walkeros/core';
import { isMethodName, methodParams } from './methods';
import { resolveContext, resolveTarget } from './context';
import { resolveDimensions } from './dimensions';
import {
  isMissing,
  toEcommerceView,
  toNumber,
  toPositiveInteger,
} from './items';

export interface BuildInput {
  event: WalkerOS.Event;
  rule?: Rule;
  data?: unknown;
  ingest?: Record<string, unknown>;
}

/**
 * `skip` is a deliberate non-send (a silent rule with no goal; an `ignore`
 * rule never reaches the destination); `invalid` is an event the rule cannot
 * turn into a request, which fails the push. `dropped` names the mapped
 * values not sent, `visitorSafe` whether Matomo can tell this visitor apart
 * without merging it into another visitor's visit.
 */
export type BuildResult =
  | { hits: Hit[]; endpoint: string; dropped: string[]; visitorSafe: boolean }
  | { skip: 'silent' }
  | { invalid: string };

/** The method and its argument for an event without a rule name. */
const DEFAULTS = new Map<string, { method: MethodName; arg: string }>([
  ['page view', { method: 'trackPageView', arg: 'data.title' }],
  ['page hide', { method: 'ping', arg: 'data.total' }],
]);

interface Selected {
  method?: MethodName;
  /** The default argument's path, for an event without a rule name. */
  arg?: string;
}

/**
 * The method a rule selects; an explicit rule name already renamed the event.
 * A rule without a method but with a goalId selects none: only its goal hit
 * is sent.
 */
function selectMethod(
  event: WalkerOS.Event,
  rule: Rule | undefined,
): Selected | { invalid: string } {
  if (rule?.name)
    return isMethodName(event.name)
      ? { method: event.name }
      : { invalid: `unknown method ${event.name}` };
  const fallback = DEFAULTS.get(event.name);
  if (fallback) return fallback;
  return rule?.settings?.goalId === undefined
    ? { invalid: 'no rule maps the event' }
    : {};
}

/** The method's positional arguments, trailing undefined ones removed. */
async function methodArgs(
  input: BuildInput,
  arg: string | undefined,
  collector: Collector.Instance,
): Promise<unknown[]> {
  const { event, rule, data } = input;
  const args: unknown[] =
    arg !== undefined && rule?.data === undefined
      ? [await getMappingValue(event, arg, { collector })]
      : data === undefined
        ? []
        : isArray(data)
          ? [...data]
          : [data];

  while (args.length && args[args.length - 1] === undefined) args.pop();
  return args;
}

/** One event -> its Tracking API hits (method hit, then goal hit), or the reason to skip it. */
export async function buildHits(
  input: BuildInput,
  settings: Settings,
  collector: Collector.Instance,
): Promise<BuildResult> {
  const { event, rule, ingest } = input;
  const ruleSettings = rule?.settings ?? {};
  const { goalId } = ruleSettings;

  const selected = selectMethod(event, rule);
  if ('invalid' in selected) return selected;
  const method = rule?.silent === true ? undefined : selected.method;
  if (method === undefined && goalId === undefined) return { skip: 'silent' };

  const dropped: string[] = [];
  const read = (value: WalkerOSMapping.Value) =>
    getMappingValue(event, value, { collector });

  let methodHit: Hit | undefined;
  if (method !== undefined) {
    const args = await methodArgs(input, selected.arg, collector);
    const items =
      ruleSettings.items === undefined
        ? undefined
        : await read(ruleSettings.items);
    const result = methodParams(method, args, items);
    if ('invalid' in result) return result;
    methodHit = result.params;

    if (ruleSettings.ecommerceView !== undefined) {
      if (method !== 'trackPageView')
        return { invalid: `${method}: ecommerceView only on trackPageView` };
      const view = toEcommerceView(await read(ruleSettings.ecommerceView));
      methodHit = [...methodHit, ...view.params];
      dropped.push(...view.dropped);
    }
  }

  // A goal Matomo cannot take is left out and named; the method hit still goes.
  let goalHit: Hit | undefined;
  if (goalId !== undefined) {
    const id = toPositiveInteger(goalId);
    if (id === undefined) dropped.push('goalId (not a positive integer)');
    else {
      const value =
        ruleSettings.goalValue === undefined
          ? undefined
          : await read(ruleSettings.goalValue);
      const revenue = isMissing(value) ? undefined : toNumber(value);
      if (!isMissing(value) && revenue === undefined)
        dropped.push('goalValue (not a number)');
      const result = methodParams('trackGoal', [id, revenue]);
      if ('invalid' in result) return result;
      goalHit = result.params;
    }
  }

  if (!methodHit && !goalHit)
    return { invalid: 'goalId not a positive integer' };

  const target = await resolveTarget(settings, event, ingest, collector);
  if ('invalid' in target) return target;

  const context = await resolveContext({ settings, event, ingest, collector });
  const dimensions = await resolveDimensions({
    destination: settings.customDimensions,
    rule: ruleSettings.customDimensions,
    event,
    collector,
  });

  // idsite, rec, apiv, the method's parameters, dimensions, then the context
  // the method did not set.
  const assemble = (params: Hit): Hit => [
    ['idsite', target.siteId],
    ['rec', '1'],
    ['apiv', '1'],
    ...params,
    ...dimensions,
    ...context.hit.filter(([key]) => !params.some(([param]) => param === key)),
  ];

  const hits: Hit[] = [];
  if (methodHit) hits.push(assemble(methodHit));
  if (goalHit) hits.push(assemble(goalHit));

  // Without both cip and ua Matomo falls back to a fingerprint of the
  // collector's IP and user agent; a uid replaces the cid.
  const sent = new Set(context.hit.map(([key]) => key));
  const visitorSafe =
    (sent.has('cip') && sent.has('ua')) ||
    (sent.has('cid') && !sent.has('uid'));

  return {
    hits,
    endpoint: target.endpoint,
    dropped: [...context.dropped, ...dropped],
    visitorSafe,
  };
}
