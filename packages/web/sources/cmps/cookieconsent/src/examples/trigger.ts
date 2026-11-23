import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createCookieConsentApi, isCookieConsentInput } from './env';

/** The path a trigger takes into the source. */
export type Dispatch = 'init' | 'consent' | 'change';

/** The `dispatch` trigger option: 'consent' or 'change', otherwise 'init'. */
export function dispatchOf(options: unknown): Dispatch {
  if (typeof options !== 'object' || options === null) return 'init';
  if (!('dispatch' in options)) return 'init';
  const { dispatch } = options;
  return dispatch === 'consent' || dispatch === 'change' ? dispatch : 'init';
}

/** The window event CookieConsent fires for a dispatch after the start. */
export function eventOf(dispatch: Dispatch): string {
  return dispatch === 'change' ? 'cc:onChange' : 'cc:onConsent';
}

/**
 * `content` is what `window.CookieConsent` answers: `{ valid, preferences }`.
 * The `dispatch` option picks the path the source reacts to:
 *   - 'init' (default): CookieConsent holds the state before the source
 *     starts, so the static read at init publishes it.
 *   - 'consent': CookieConsent reports a decision after the source started
 *     and fires cc:onConsent.
 *   - 'change': the visitor changes a decision and CookieConsent fires
 *     cc:onChange.
 * Once the flow runs, every further trigger fires the event.
 */
const createTrigger: Trigger.CreateFn<unknown, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<unknown, void> =
    (_type?: string, opts?: unknown) => async (content: unknown) => {
      if (!isCookieConsentInput(content))
        throw new Error(
          'CookieConsent trigger content is what window.CookieConsent answers: { valid, preferences: { acceptedCategories, rejectedCategories } }',
        );
      const dispatch = dispatchOf(opts);
      const api = createCookieConsentApi(content);

      if (!flow && dispatch === 'init')
        Object.assign(window, { CookieConsent: api });

      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
        if (dispatch === 'init') return;
      }

      Object.assign(window, { CookieConsent: api });
      window.dispatchEvent(new CustomEvent(eventOf(dispatch)));
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

export { createTrigger };
