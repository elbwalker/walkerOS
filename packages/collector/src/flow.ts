import type { Collector, Elb } from '@walkeros/core';
import type { StartFlow } from './types';
import { collector } from './collector';
import { createElbSource } from './elb';
import { initSources } from './source';

export async function startFlow<ElbPush extends Elb.Fn = Elb.Fn>(
  initConfig?: Collector.InitConfig,
): Promise<StartFlow<ElbPush>> {
  initConfig = initConfig || {};
  const instance = await collector(initConfig);

  // Create and register ELB source first
  const elbSource = createElbSource(instance);
  instance.sources.elb = elbSource;

  // Now initialize other sources with ELB source available
  const additionalSources = await initSources(
    instance,
    initConfig.sources || {},
  );
  Object.assign(instance.sources, additionalSources);

  const { consent, user, globals, custom } = initConfig;

  if (consent) await instance.command('consent', consent);
  if (user) await instance.command('user', user);
  if (globals) Object.assign(instance.globals, globals);
  if (custom) Object.assign(instance.custom, custom);

  if (instance.config.run) await instance.command('run');

  // Determine the primary elb:
  // 1. Use explicitly marked primary source
  // 2. Use first non-elb source if any exist
  // 3. Fallback to ELB source
  let primaryElb: Elb.Fn = elbSource.push as Elb.Fn;

  const sources = Object.values(instance.sources).filter(
    (source) => source.type !== 'elb',
  );

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
