import type { Collector, Elb } from '@walkeros/core';
import type { StartFlow } from './types';
import { collector } from './collector';
import { initSources } from './source';

export async function startFlow<ElbPush extends Elb.Fn = Elb.Fn>(
  initConfig?: Collector.InitConfig,
): Promise<StartFlow<ElbPush>> {
  initConfig = initConfig || {};
  const instance = await collector(initConfig);

  // Initialize sources; the collector's elb adapter is already available
  await initSources(instance, initConfig.sources || {});

  const { consent, user, globals, custom } = initConfig;

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

  // First, check for explicitly marked primary source
  const markedPrimary = sources.find(
    (source) => (source.config as { primary?: boolean }).primary,
  );

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
