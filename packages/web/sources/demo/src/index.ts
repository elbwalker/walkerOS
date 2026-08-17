import type { Source } from '@walkeros/core';
import type { Types } from './types';

export * as SourceDemo from './types';

/**
 * Demo source for walkerOS
 *
 * Pushes configured events to the collector with optional delays.
 * Perfect for testing and demonstrations without external dependencies.
 */
export const sourceDemo: Source.Init<Types> = async (
  context,
): Promise<Source.Instance<Types>> => {
  const { config, env } = context;
  // Synthetic events exit via `push` (the collector's source pipeline), so a
  // demo flow's next/before chain, mapping and status apply to them.
  const { elb, push } = env;

  const fullConfig: Source.Config<Types> = {
    ...config,
    settings: config?.settings || { events: [] },
  };

  const events = fullConfig.settings?.events || [];

  // Push each event with optional delay
  events.forEach((event) => {
    const { delay, ...partialEvent } = event;
    setTimeout(() => push(partialEvent), delay || 0);
  });

  return {
    type: 'demo',
    config: fullConfig,
    // The outward-facing slot, deliberately `elb` and not the pipeline `push`:
    // callers do not feed this source events, it emits its configured ones
    // above (through `push`, so the pipeline applies to them).
    push: elb,
  };
};

export default sourceDemo;
