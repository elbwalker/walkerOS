import type {
  Collector,
  Destination,
  Elb,
  Source,
  Store,
  Transformer,
} from '@walkeros/core';
import type { StartFlow } from './types';
import { collector } from './collector';
import { startObserve } from './observe';
import { initSources } from './source';

/**
 * Creates a collector, initializes its sources and runs the flow.
 *
 * Each step entry is typed from its own `code`: settings, mapping rule
 * settings and `env` keys autocomplete and are checked per entry. An entry
 * without inferable Types (a code-less hop, an untyped mock) stays loose on
 * its own. Write the config inline: an explicit type argument
 * (`startFlow<Push>(...)`) turns the inference off for the whole call.
 */
export async function startFlow<
  ElbPush extends Elb.Fn = Elb.Fn,
  S = Record<string, Source.TypesGeneric>,
  D = Record<string, Destination.TypesGeneric>,
  T = Record<string, Transformer.TypesGeneric>,
  St = Record<string, Store.TypesGeneric>,
>(
  initConfig?: Collector.InitConfigOf<S, D, T, St>,
): Promise<StartFlow<ElbPush>> {
  const config: Collector.InitConfig = initConfig ?? {};
  const instance = await collector(config);

  // Caller-supplied observers land in the advisory Set verbatim.
  if (config.observers) {
    for (const observer of config.observers) {
      instance.observers.add(observer);
    }
  }

  // The Observe reporter starts before the sources, so their records reach
  // it. Build flag (see @walkeros/core build-flags): a bundle built without
  // the reporter folds it out and names the block it ignores.
  if (config.observe !== undefined) {
    if (typeof __WALKEROS_OBSERVE__ === 'undefined' || __WALKEROS_OBSERVE__) {
      instance.reporter = startObserve(instance, config.observe);
    } else {
      instance.logger.error('observe: not in this build, config ignored');
    }
  }

  // Initialize sources; the collector's elb adapter is already available
  await initSources(instance, config.sources || {});

  const { consent, user, globals, custom } = config;

  // Route all four startup state cells through `command` so each bumps
  // `stateVersion`, broadcasts to subscribers, and triggers reconcile. A bare
  // `Object.assign` for globals/custom would silently skip those, leaving a
  // `require:["globals"]` step un-reconciled and `on('globals')` subscribers
  // un-notified at startup.
  if (consent) await instance.command('consent', consent);
  if (user) await instance.command('user', user);
  if (globals) await instance.command('globals', globals);
  if (custom) await instance.command('custom', custom);

  if (instance.config.run) await instance.command('run');

  // Determine the primary elb:
  // 1. Use explicitly marked primary source
  // 2. Use first source if any exist
  // 3. Fallback to the collector's elb adapter
  let primaryElb: Elb.Fn = instance.elb;

  const sources = Object.values(instance.sources);

  // First, check for explicitly marked primary source. `initSources` mirrors a
  // top-level `InitSource.primary` onto the instance config, so both spellings
  // are visible here.
  const markedPrimary = sources.find((source) => source.config.primary);

  if (markedPrimary) {
    primaryElb = markedPrimary.push as Elb.Fn;
  } else if (sources.length > 0) {
    // Use first source as default
    primaryElb = sources[0].push as Elb.Fn;
  }

  return {
    collector: instance,
    elb: primaryElb as ElbPush,
  };
}
