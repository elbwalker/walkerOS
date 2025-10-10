import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import type { StartFlow } from './types';
import { collector } from './collector';

export async function startFlow<
  TConfig extends Collector.InitConfig = Collector.InitConfig,
>(initConfig: TConfig = {} as TConfig): Promise<StartFlow> {
  const instance = await collector(initConfig);
  const { consent, user, globals, custom } = initConfig;

  if (consent) await instance.push('walker consent', consent);
  if (user) await instance.push('walker user', user);
  if (globals) Object.assign(instance.globals, globals);
  if (custom) Object.assign(instance.custom, custom);

  if (instance.config.run) await instance.push('walker run');

  // Determine the primary elb: use primary source if marked, otherwise collector.push
  let primaryElb: Elb.Fn = instance.push;

  for (const source of Object.values(instance.sources)) {
    // Check if this source is marked as primary
    const isPrimary = (source.config as { primary?: boolean }).primary;
    if (isPrimary) {
      primaryElb = source.push;
      break; // Use the first primary source found
    }
  }

  return {
    collector: instance,
    elb: primaryElb,
  };
}
