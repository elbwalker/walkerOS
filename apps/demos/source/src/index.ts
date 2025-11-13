import type { Source } from '@walkeros/core';
import type { Types } from './types';

export * as SourceDemo from './types';
export * as examples from './examples';

/**
 * Demo source for walkerOS
 *
 * Pushes configured events to the collector with optional delays.
 * Perfect for testing and demonstrations without external dependencies.
 */
export const sourceDemo: Source.Init<Types> = async (
  config: Partial<Source.Config<Types>>,
  env: Source.Env<Types>,
): Promise<Source.Instance<Types>> => {
  const { elb } = env;

  const fullConfig: Source.Config<Types> = {
    ...config,
    settings: config?.settings || { events: [] },
  };

  const events = fullConfig.settings?.events || [];

  // Push each event with optional delay
  events.forEach((event) => {
    const { delay, ...partialEvent } = event;
    setTimeout(() => elb(partialEvent), delay || 0);
  });

  return {
    type: 'demo',
    config: fullConfig,
    push: elb,
  };
};

export default sourceDemo;
