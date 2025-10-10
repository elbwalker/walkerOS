import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import type { StartFlow } from './types';
import { collector } from './collector';

export async function startFlow<
  TConfig extends Collector.InitConfig = Collector.InitConfig,
  ElbPush extends Elb.Fn = Elb.Fn,
>(initConfig: TConfig = {} as TConfig): Promise<StartFlow<ElbPush>> {
  const instance = await collector(initConfig);
  const { consent, user, globals, custom } = initConfig;

  if (consent) await instance.push('walker consent', consent);
  if (user) await instance.push('walker user', user);
  if (globals) Object.assign(instance.globals, globals);
  if (custom) Object.assign(instance.custom, custom);

  if (instance.config.run) await instance.push('walker run');

  // Determine the primary elb:
  // 1. Use explicitly marked primary source
  // 2. Use first source if any exist
  // 3. Fallback to collector.push
  let primaryElb: Elb.Fn = instance.push;

  const sources = Object.values(instance.sources);

  // First, check for explicitly marked primary source
  const markedPrimary = sources.find(
    (source) => (source.config as { primary?: boolean }).primary,
  );

  if (markedPrimary) {
    primaryElb = markedPrimary.push;
  } else if (sources.length > 0) {
    // Use first source as default
    primaryElb = sources[0].push;
  }

  return {
    collector: instance,
    elb: primaryElb as ElbPush,
  };
}
