import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { CookiebotAPI } from '../types';

/**
 * `content` is the `window.Cookiebot` state. The `dispatch` option picks the
 * path the source reacts to:
 *   - 'init' (default): Cookiebot holds the state before the source starts,
 *     so the static read at init publishes it.
 *   - 'event': Cookiebot reports the state after the source started and fires
 *     CookiebotOnAccept (consented) or CookiebotOnDecline (otherwise).
 * Once the flow runs, every further trigger fires the event.
 */
const createTrigger: Trigger.CreateFn<unknown, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<unknown, void> =
    (_type?: string, opts?: unknown) => async (content: unknown) => {
      if (!isCookiebotState(content))
        throw new Error(
          'Cookiebot trigger content is the window.Cookiebot state: { consent: { necessary, preferences, statistics, marketing, method } }',
        );
      const viaEvent =
        typeof opts === 'object' &&
        opts !== null &&
        'dispatch' in opts &&
        opts.dispatch === 'event';

      if (!flow && !viaEvent) Object.assign(window, { Cookiebot: content });

      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
        if (!viaEvent) return;
      }

      Object.assign(window, { Cookiebot: content });
      window.dispatchEvent(
        new Event(
          content.consented ? 'CookiebotOnAccept' : 'CookiebotOnDecline',
        ),
      );
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

function isCookiebotState(value: unknown): value is CookiebotAPI {
  return (
    typeof value === 'object' &&
    value !== null &&
    'consent' in value &&
    typeof value.consent === 'object' &&
    value.consent !== null
  );
}

export { createTrigger };
