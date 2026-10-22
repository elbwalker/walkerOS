import type { Collector, WalkerOS } from '@walkeros/core';
import type { Hit, Rule, Settings } from './types';
import { getMappingValue, isArray } from '@walkeros/core';
import { DIMENSIONS_ARG, isMethodName, methodParams } from './methods';
import type { MethodName } from './methods';
import { isIdentified, resolveContext } from './context';
import { resolveDimensions } from './dimensions';

declare const __VERSION__: string;

export interface BuildInput {
  event: WalkerOS.Event;
  rule?: Rule;
  data?: unknown;
  ingest?: Record<string, unknown>;
}

/**
 * `skip` is a deliberate non-send (a silent rule with nothing else to send;
 * an `ignore` rule never reaches the destination); `invalid` is an event the
 * rule cannot turn into a request, which fails the push.
 */
export type BuildResult =
  | { hits: Hit[] }
  | { skip: 'silent' }
  | { invalid: string };

type Unsent = Exclude<BuildResult, { hits: Hit[] }>;

/**
 * The method a rule selects; an explicit rule name already renamed the event.
 * A rule without a method but with a goalId selects none: only its goal hit is sent.
 */
function selectMethod(
  event: WalkerOS.Event,
  rule: Rule | undefined,
): { method?: MethodName } | Unsent {
  const name = rule?.name
    ? event.name
    : event.name === 'page view'
      ? 'trackPageView'
      : undefined;
  if (name === undefined)
    return rule?.settings?.goalId === undefined
      ? { invalid: 'no rule maps the event' }
      : {};
  if (!isMethodName(name)) return { invalid: `unknown method ${name}` };
  return { method: name };
}

async function methodArgs(
  input: BuildInput,
  collector: Collector.Instance,
): Promise<unknown[]> {
  const { event, rule, data } = input;
  const args: unknown[] =
    !rule?.name && event.name === 'page view' && rule?.data === undefined
      ? [await getMappingValue(event, 'data.title', { collector })]
      : data === undefined
        ? []
        : isArray(data)
          ? [...data]
          : [data];

  while (args.length && args[args.length - 1] === undefined) args.pop();
  return args;
}

/** Common parameters, method parameters, dimensions, then context the method did not set. */
function assemble(
  settings: Settings,
  params: Hit,
  dimensions: Hit,
  context: Hit,
  identified: boolean,
): Hit {
  const hit: Hit = [
    ['idsite', settings.appId],
    ['rec', '1'],
    ['send_image', '0'],
    ['ts_n', 'walkerOS'],
    ['ts_v', __VERSION__],
    ...params,
    ...dimensions,
    ...context.filter(([key]) => !params.some(([param]) => param === key)),
  ];
  if (!identified) hit.push(['uia', '1'], ['dda', '1']);
  return hit;
}

/** One event -> its Tracking API hits (method hit, then goal hit), or the reason to skip it. */
export async function buildHits(
  input: BuildInput,
  settings: Settings,
  collector: Collector.Instance,
): Promise<BuildResult> {
  const { event, rule, ingest } = input;

  const selected = selectMethod(event, rule);
  if ('skip' in selected || 'invalid' in selected) return selected;
  const { method } = selected;

  const identified = isIdentified(settings.identified, collector, event);
  const context = await resolveContext({
    settings,
    event,
    ingest,
    collector,
    identified,
  });

  const dimensions = {
    destination: settings.customDimensions,
    rule: rule?.settings?.customDimensions,
    event,
    collector,
  };
  const hits: Hit[] = [];

  if (method !== undefined && rule?.silent !== true) {
    const args = await methodArgs(input, collector);
    const result = methodParams(method, args);
    if ('invalid' in result) return { invalid: result.invalid };
    const index = DIMENSIONS_ARG[method];
    const argument = index === undefined ? undefined : args[index];
    hits.push(
      assemble(
        settings,
        result.params,
        await resolveDimensions({ ...dimensions, argument }),
        context,
        identified,
      ),
    );
  }

  const goalId = rule?.settings?.goalId;
  if (goalId !== undefined) {
    const goalValue = rule?.settings?.goalValue;
    const value =
      goalValue === undefined
        ? undefined
        : await getMappingValue(event, goalValue, { collector });
    const result = methodParams('trackGoal', [goalId, value]);
    if ('invalid' in result) return { invalid: result.invalid };
    hits.push(
      assemble(
        settings,
        result.params,
        await resolveDimensions(dimensions),
        context,
        identified,
      ),
    );
  }

  if (!hits.length) return { skip: 'silent' };
  if (hits.some((hit) => !hit.some(([key]) => key === 'url')))
    return { invalid: 'missing url' };

  return { hits };
}
