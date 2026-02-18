import type { Source, WalkerOS } from '@walkeros/core';
import type { Types, Settings, OneTrustAPI } from './types';

// Export types for external usage
export * as SourceCookiePro from './types';

// Export examples
export * from './examples';

/**
 * Default category mapping from CookiePro/OneTrust to walkerOS consent groups.
 *
 * Keys use OneTrust's standard uppercase IDs (as shown in CookiePro dashboard).
 * Lookups are case-insensitive (normalized during init).
 *
 * Maps OneTrust's standard category IDs to walkerOS convention:
 * - C0001 (Strictly Necessary) -> functional
 * - C0002 (Performance) -> analytics
 * - C0003 (Functional) -> functional
 * - C0004 (Targeting) -> marketing
 * - C0005 (Social Media) -> marketing
 */
export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  C0001: 'functional',
  C0002: 'analytics',
  C0003: 'functional',
  C0004: 'marketing',
  C0005: 'marketing',
};

/**
 * CookiePro/OneTrust consent management source for walkerOS.
 *
 * This source listens to CookiePro/OneTrust CMP events and translates
 * consent states to walkerOS consent commands.
 *
 * Three detection paths:
 * 1. Already loaded: window.OneTrust + window.OptanonActiveGroups
 * 2. Init: Wraps OptanonWrapper (preserves existing)
 * 3. Change: OneTrustGroupsUpdated window event
 *
 * @example
 * ```typescript
 * import { sourceCookiePro } from '@walkeros/web-source-cmp-cookiepro';
 *
 * await startFlow({
 *   sources: {
 *     consent: {
 *       code: sourceCookiePro,
 *       config: {
 *         settings: {
 *           categoryMap: {
 *             C0002: 'statistics', // Custom mapping
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const sourceCookiePro: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb } = env;

  // Resolve window with fallback to globalThis
  const actualWindow =
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
    globalName: config?.settings?.globalName ?? 'OneTrust',
  };

  const fullConfig: Source.Config<Types> = { settings };

  // Track references for cleanup
  let eventListener: (() => void) | undefined;
  let originalOptanonWrapper: (() => void) | undefined;
  let wrappedOptanonWrapper = false;

  if (actualWindow) {
    const globalName = settings.globalName ?? 'OneTrust';

    /**
     * Collect all unique walkerOS group names from the normalizedMap.
     * Used to set explicit false for absent groups.
     */
    const allMappedGroups = new Set(Object.values(normalizedMap));

    /**
     * Parse OptanonActiveGroups string into walkerOS consent state.
     *
     * OptanonActiveGroups format: ",C0001,C0003," (comma-separated, leading/trailing commas)
     * Only active groups are listed. Absence means denied.
     * Uses case-insensitive comparison for category IDs via normalizedMap.
     * Only mapped categories produce consent entries (unmapped IDs are ignored).
     * Sets explicit false for all mapped groups not in the active list.
     */
    const parseActiveGroups = (activeGroups: string): WalkerOS.Consent => {
      const state: WalkerOS.Consent = {};

      // Initialize all mapped groups to false
      allMappedGroups.forEach((group) => {
        state[group] = false;
      });

      // Set active groups to true (case-insensitive via normalizedMap)
      activeGroups
        .split(',')
        .filter((id) => id.length > 0)
        .forEach((id) => {
          const mapped = normalizedMap[id.toLowerCase()];
          if (mapped) {
            state[mapped] = true;
          }
        });

      return state;
    };

    /**
     * Handle consent by reading current OptanonActiveGroups from window.
     * Checks explicitOnly against IsAlertBoxClosed when available.
     */
    const handleConsent = () => {
      const activeGroups = actualWindow.OptanonActiveGroups;
      if (activeGroups === undefined || activeGroups === null) return;

      // Check explicit consent if required
      if (settings.explicitOnly) {
        const cmp = actualWindow[globalName] as OneTrustAPI | undefined;
        if (cmp?.IsAlertBoxClosed && !cmp.IsAlertBoxClosed()) return;
      }

      const state = parseActiveGroups(activeGroups);

      // Only call if we have consent state to report
      if (Object.keys(state).length > 0) {
        elb('walker consent', state);
      }
    };

    // --- Detection path 1: Already loaded ---
    const cmp = actualWindow[globalName] as OneTrustAPI | undefined;
    if (cmp && actualWindow.OptanonActiveGroups !== undefined) {
      handleConsent();
    }

    // --- Detection path 2: OptanonWrapper ---
    // Only wrap if SDK is not yet loaded (no already-loaded path).
    // Self-unwraps after first call -- the event listener handles all
    // subsequent changes, avoiding double-firing.
    if (!cmp) {
      originalOptanonWrapper = actualWindow.OptanonWrapper;
      wrappedOptanonWrapper = true;

      actualWindow.OptanonWrapper = () => {
        // Call original wrapper if it existed
        if (originalOptanonWrapper) originalOptanonWrapper();
        handleConsent();
        // Self-unwrap: restore original after first call (SDK init).
        // The OneTrustGroupsUpdated listener handles all future changes.
        actualWindow.OptanonWrapper = originalOptanonWrapper;
        wrappedOptanonWrapper = false;
      };
    }

    // --- Detection path 3: OneTrustGroupsUpdated event ---
    eventListener = () => {
      handleConsent();
    };
    actualWindow.addEventListener('OneTrustGroupsUpdated', eventListener);
  }

  return {
    type: 'cookiepro',
    config: fullConfig,
    push: elb,
    destroy: async () => {
      // Remove event listener
      if (actualWindow && eventListener) {
        actualWindow.removeEventListener(
          'OneTrustGroupsUpdated',
          eventListener,
        );
      }
      // Restore original OptanonWrapper
      if (actualWindow && wrappedOptanonWrapper) {
        actualWindow.OptanonWrapper = originalOptanonWrapper;
      }
    },
  };
};

export default sourceCookiePro;
