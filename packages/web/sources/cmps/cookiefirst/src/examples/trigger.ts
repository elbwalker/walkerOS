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
      // The banner keeps window.CookieFirst current.
      (window as unknown as Record<string, unknown>).CookieFirst = {
        consent: content,
      };

      // First call, the page load: the source reads the global at init and
      // emits once. No cf_init follows: in a browser it fires when the global
      // appears, so a page where the global is already set has seen it before
      // the source started. One page load emits one consent.
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
        return;
      }

      // Later calls are a decision on the loaded page: CookieFirst announces
      // it with cf_consent, carrying the new consent.
      window.dispatchEvent(
        new CustomEvent<CookieFirstConsent>('cf_consent', { detail: content }),
      );
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
