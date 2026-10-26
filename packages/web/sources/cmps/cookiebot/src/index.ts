import type { Source, WalkerOS } from '@walkeros/core';
import type {
  Types,
  Settings,
  CookiebotConsent,
  CookiebotWindow,
} from './types';

// Export types for external usage
export * as SourceCookiebot from './types';

/**
 * Default category mapping from Cookiebot to walkerOS consent groups.
 *
 * - preferences -> functional
 * - statistics -> analytics
 * - marketing -> marketing
 *
 * `necessary` has no entry and keeps its own name: Cookiebot always grants
 * it, so mapping it to functional would grant functional with every choice.
 */
export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  preferences: 'functional',
  statistics: 'analytics',
  marketing: 'marketing',
};

/**
 * Cookiebot's window events for a decision. uc.js fires one of them on every
 * page load with a stored choice and again after each new choice or
 * withdrawal. Its `CookieConsentOn*` aliases and `CookiebotOnConsentReady`,
 * which fires before Cookiebot's version check, are left out.
 */
const DECISION_EVENTS = ['CookiebotOnAccept', 'CookiebotOnDecline'];

/**
 * Cookiebot consent management source for walkerOS.
 *
 * This source reads Cookiebot's consent and translates it to walkerOS
 * consent commands.
 *
 * Two detection paths:
 * 1. Already loaded: window.Cookiebot with a response
 * 2. Decision: CookiebotOnAccept and CookiebotOnDecline window events
 *
 * @example
 * ```typescript
 * import { sourceCookiebot } from '@walkeros/web-source-cmp-cookiebot';
 *
 * await startFlow({
 *   sources: {
 *     consent: {
 *       code: sourceCookiebot,
 *       config: {
 *         settings: {
 *           categoryMap: {
 *             statistics: 'statistics', // Custom mapping
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const sourceCookiebot: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb } = env;

  // Resolve window with fallback to globalThis
  const actualWindow: CookiebotWindow | undefined =
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
    explicitOnly: config?.settings?.explicitOnly ?? true,
  };

  const fullConfig: Source.Config<Types> = { settings };

  // Track the listener for cleanup
  let decisionListener: (() => void) | undefined;
  // The last state sent, so a repeated signal for the same choice is dropped
  let lastState: string | undefined;

  /**
   * Map Cookiebot categories to walkerOS consent groups. When several
   * categories map to the same group, any deny denies: the group is true only
   * if every one of them is true. Non-boolean fields (method, stamp) are
   * skipped.
   */
  const toState = (consent: CookiebotConsent): WalkerOS.Consent => {
    const state: WalkerOS.Consent = {};
    Object.entries(consent).forEach(([category, value]) => {
      if (typeof value !== 'boolean') return;
      const mapped = normalizedMap[category.toLowerCase()] ?? category;
      // Any deny denies: once false, stays false
      state[mapped] =
        state[mapped] === undefined ? value : state[mapped] && value;
    });
    return state;
  };

  /**
   * Read window.Cookiebot.consent and publish it as a walker consent command.
   * A consent without method is no consent. With explicitOnly, only an
   * explicit method is published.
   */
  const handleConsent = () => {
    const consent = actualWindow?.Cookiebot?.consent;
    const method = consent?.method?.toLowerCase();
    if (!consent || !method) return;
    if (settings.explicitOnly && method !== 'explicit') return;

    const state = toState(consent);
    if (Object.keys(state).length === 0) return;

    // Cookiebot fires a decision event on every page load with a stored
    // choice, so a static read and that event report the same state twice.
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
    if (actualWindow.Cookiebot?.hasResponse) handleConsent();

    // --- Detection path 2: Decision events ---
    const onDecision = () => handleConsent();
    decisionListener = onDecision;
    DECISION_EVENTS.forEach((name) =>
      actualWindow.addEventListener(name, onDecision),
    );
  };

  return {
    type: 'cookiebot',
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

export default sourceCookiebot;
