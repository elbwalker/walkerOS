import type { Collector, Elb } from '@walkeros/core';
import {
  sessionStart as sessionStartOrg,
  SessionConfig,
} from '@walkeros/web-core';

export function createSessionStart(elb: Elb.Fn) {
  return function (
    options: { config?: SessionConfig; data?: Collector.SessionData } = {},
  ): void | Collector.SessionData {
    const { config = {} } = options;
    return sessionStart(elb, {
      ...config,
      pulse: config.pulse !== undefined ? config.pulse : true,
    });
  };
}

export function sessionStart(
  elb: Elb.Fn,
  config: SessionConfig = {},
): void | Collector.SessionData {
  // Create minimal collector interface for sessionStart that needs elb and group tracking
  const collectorInterface: Partial<Collector.Instance> = {
    push: elb,
    group: undefined, // Session tracking doesn't need group initially
  };

  return sessionStartOrg({
    ...config,
    collector: collectorInterface as Collector.Instance,
  });
}
