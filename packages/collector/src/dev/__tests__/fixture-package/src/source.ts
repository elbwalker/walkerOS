import type { Elb, Source, WalkerOS } from '@walkeros/core';
import { StepError } from '@walkeros/core';

type Push = (content: WalkerOS.DeepPartialEvent) => Promise<Elb.PushResult>;
type Types = Source.Types<{ path?: string }, unknown, Push>;

/** Forwards what it receives to the collector. */
export const forwarding: Source.Init<Types> = async ({ config, env }) => {
  if (!config.settings?.path)
    throw new StepError('Config settings path missing', { code: 'config' });
  return {
    type: 'forwarding',
    config,
    push: (content: WalkerOS.DeepPartialEvent) => env.push(content),
  };
};

/** Logs the input it receives: personal data in a log line (item 7). */
export const chatty: Source.Init<Types> = async (context) => {
  const source = await forwarding(context);
  return {
    ...source,
    push: (content: WalkerOS.DeepPartialEvent) => {
      context.logger.debug('received', { content });
      return context.env.push(content);
    },
  };
};
