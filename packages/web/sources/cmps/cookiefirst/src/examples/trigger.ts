import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

interface CookieFirstConsent {
  necessary?: boolean;
  functional?: boolean;
  performance?: boolean;
  advertising?: boolean;
  [category: string]: boolean | undefined;
}

const createTrigger: Trigger.CreateFn<CookieFirstConsent, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<CookieFirstConsent, void> =
    () => async (content: CookieFirstConsent) => {
      // Pre-init: set CookieFirst global (source reads this during init)
      (window as unknown as Record<string, unknown>).CookieFirst = {
        consent: content,
      };

      // Lazy startFlow — source reads global + registers event listeners
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
      }

      // Post-init: dispatch cf_init to trigger consent processing
      window.dispatchEvent(new Event('cf_init'));
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/** Sets window.CookieFirst.consent before source init (legacy). */
const trigger = (input: unknown, env: Record<string, unknown>): void => {
  if (!input || typeof input !== 'object') return;
  (env.window as Record<string, unknown>).CookieFirst = { consent: input };
};

export { createTrigger, trigger };
