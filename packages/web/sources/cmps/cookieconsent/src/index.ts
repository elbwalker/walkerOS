import type { Source, WalkerOS } from '@walkeros/core';
import { tryCatch } from '@walkeros/core';
import type {
  Types,
  Settings,
  UserPreferences,
  CookieConsentWindow,
} from './types';

// Export types for external usage
export * as SourceCookieConsent from './types';

/**
 * Default category mapping from CookieConsent to walkerOS consent groups.
 *
 * - ads -> marketing
 *
 * The CookieConsent docs configure the categories `necessary`, `analytics`
 * and `ads`. `analytics` and `necessary` have no entry and keep their names:
 * CookieConsent always accepts the read-only `necessary`, so mapping it to a
 * group would grant that group with every choice.
 */
export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  ads: 'marketing',
};

/**
 * CookieConsent's window events for a decision. `cc:onConsent` fires on a
 * first decision and on every page load with a valid one, `cc:onChange` when
 * the visitor changes it. `cc:onFirstConsent` always precedes `cc:onConsent`
 * and is left out.
 */
const DECISION_EVENTS = ['cc:onConsent', 'cc:onChange'];

/** The signal of the static read at init, where an absent CMP is no error. */
const INIT_SIGNAL = 'init';

/**
 * CookieConsent (orestbida) consent management source for walkerOS.
 *
 * This source reads CookieConsent's decision through its API and translates
 * it to walkerOS consent commands. It publishes a decision only while
 * `CookieConsent.validConsent()` is true.
 *
 * Two detection paths:
 * 1. Already loaded: window.CookieConsent with a valid consent
 * 2. Decision: cc:onConsent and cc:onChange window events
 *
 * @example
 * ```typescript
 * import { sourceCookieConsent } from '@walkeros/web-source-cmp-cookieconsent';
 *
 * await startFlow({
 *   sources: {
 *     consent: {
 *       code: sourceCookieConsent,
 *       config: {
 *         settings: {
 *           categoryMap: {
 *             analytics: 'statistics', // Custom mapping
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const sourceCookieConsent: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb, logger } = env;

  // Resolve window with fallback to globalThis
  const actualWindow: CookieConsentWindow | undefined =
    env.window ??
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined);

  // Merge user settings with defaults (user overrides win)
  const mergedCategoryMap = {
    ...DEFAULT_CATEGORY_MAP,
    ...(config?.settings?.categoryMap ?? {}),
  };

  // Build normalized (lowercase) lookup map for case-insensitive matching
  const normalizedMap: Record<string, string> = {};
  Object.entries(mergedCategoryMap).forEach(([key, value]) => {
    normalizedMap[key.toLowerCase()] = value;
  });

  const settings: Settings = {
    categoryMap: mergedCategoryMap, // Preserves original casing for config
  };

  const fullConfig: Source.Config<Types> = { settings };

  // Track the listener for cleanup
  let decisionListener: EventListener | undefined;
  // The last state sent, so a repeated signal for the same choice is dropped
  let lastState: string | undefined;

  /**
   * Map CookieConsent categories to walkerOS consent groups: accepted ones
   * to true, rejected ones to false. When several categories map to the same
   * group, any deny denies: the group is true only if every one of them is
   * accepted.
   */
  const toState = (preferences: UserPreferences): WalkerOS.Consent => {
    const state: WalkerOS.Consent = {};
    const add = (category: string, value: boolean) => {
      const mapped = normalizedMap[category.toLowerCase()] ?? category;
      // Any deny denies: once false, stays false
      state[mapped] =
        state[mapped] === undefined ? value : state[mapped] && value;
    };
    preferences.acceptedCategories.forEach((category) => add(category, true));
    preferences.rejectedCategories.forEach((category) => add(category, false));
    return state;
  };

  /**
   * Read the decision through window.CookieConsent and publish it as a
   * walker consent command. Without a valid consent there is no decision,
   * so nothing is published. A decision event the source cannot read logs
   * one ERROR line; at init an absent CMP is no error.
   */
  const handleConsent = (signal: string) => {
    const api = actualWindow?.CookieConsent;
    if (!api) {
      if (signal !== INIT_SIGNAL)
        logger.error(
          `CookieConsent fired ${signal}, but window.CookieConsent is missing: with the ESM build, assign the import to window.CookieConsent`,
        );
      return;
    }

    if (!api.validConsent()) return;

    const preferences = tryCatch(
      () => api.getUserPreferences(),
      (error) => {
        logger.error(
          'CookieConsent decision could not be read: getUserPreferences failed',
          error,
        );
        return undefined;
      },
    )();
    if (!preferences) return;

    const state = toState(preferences);
    if (Object.keys(state).length === 0) return;

    // CookieConsent fires cc:onConsent on every page load with a valid
    // decision, and in opt-out mode cc:onChange right after it, so two
    // signals report the same state.
    const key = JSON.stringify(Object.entries(state).sort());
    if (key === lastState) return;
    lastState = key;

    elb('walker consent', state);
  };

  // Attach the listener and perform the static consent read. Deferred to
  // init() (Pass 2 of initSources) so the factory (Pass 1) stays side-effect
  // free: no listener registration and no `elb('walker consent')` emit during
  // construction.
  const init = async (): Promise<void> => {
    if (!actualWindow) return;

    // --- Detection path 1: Already loaded ---
    handleConsent(INIT_SIGNAL);

    // --- Detection path 2: Decision events ---
    const onDecision: EventListener = (event) => handleConsent(event.type);
    decisionListener = onDecision;
    DECISION_EVENTS.forEach((name) =>
      actualWindow.addEventListener(name, onDecision),
    );
  };

  return {
    type: 'cookieconsent',
    config: fullConfig,
    push: elb,
    init,
    destroy: async (_context) => {
      const listener = decisionListener;
      if (!actualWindow || !listener) return;
      DECISION_EVENTS.forEach((name) =>
        actualWindow.removeEventListener(name, listener),
      );
      decisionListener = undefined;
    },
  };
};

export default sourceCookieConsent;
