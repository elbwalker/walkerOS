import type { Source, WalkerOS } from '@walkeros/core';
import type { Types, Settings, CmpConsent, CmpAPI } from './types';

// Export types for external usage
export * as SourceCmpName from './types';

/**
 * Default category mapping from CMP to walkerOS consent groups.
 *
 * TODO: Populate with your CMP's standard categories.
 * Use a populated map when the CMP uses opaque or non-standard category names.
 * Use an empty map when the CMP uses human-readable, admin-configured names.
 */
export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  necessary: 'functional',
  functional: 'functional',
  performance: 'analytics',
  advertising: 'marketing',
};

/**
 * CMP consent management source for walkerOS.
 *
 * Listens to CMP events and translates consent states into
 * walkerOS consent commands via elb('walker consent', state).
 *
 * TODO: Rename to source[YourCmpName] and update all placeholders.
 */
export const sourceCmpName: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb } = env;

  // 1. Resolve window with fallback to globalThis
  const actualWindow =
    env.window ??
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined);

  // 2. Merge user settings with defaults
  const settings: Settings = {
    categoryMap: { ...DEFAULT_CATEGORY_MAP, ...config?.settings?.categoryMap },
    explicitOnly: config?.settings?.explicitOnly ?? true,
    globalName: config?.settings?.globalName ?? 'CmpName', // TODO: Your CMP's global name
  };

  const fullConfig: Source.Config<Types> = { settings };

  // 3. Track listener references for cleanup
  let initListener: (() => void) | undefined;
  let consentListener: ((e: Event) => void) | undefined;

  if (actualWindow) {
    // 4. handleConsent -- maps CMP categories to walkerOS consent groups
    const handleConsent = (consent: CmpConsent | null) => {
      // Check explicitOnly
      if (settings.explicitOnly && !consent) return;
      if (!consent) return;

      // Map categories using OR logic: if ANY source category is true,
      // the target group is true
      const state: WalkerOS.Consent = {};
      Object.entries(consent).forEach(([category, value]) => {
        if (typeof value !== 'boolean') return;
        const mapped = settings.categoryMap?.[category] ?? category;
        state[mapped] = state[mapped] || value;
      });

      if (Object.keys(state).length > 0) {
        elb('walker consent', state);
      }
    };

    const globalName = settings.globalName ?? 'CmpName';
    const cmp = actualWindow[globalName] as CmpAPI | undefined;

    // 5. Detection path: Already loaded
    if (cmp?.consent) {
      handleConsent(cmp.consent);
    }

    // 6. Detection path: Init listener
    // TODO: Replace 'cmp_init' with your CMP's init event
    initListener = () => {
      const cmp = actualWindow[globalName] as CmpAPI | undefined;
      handleConsent(cmp?.consent ?? null);
    };
    actualWindow.addEventListener('cmp_init', initListener);

    // 7. Detection path: Change listener
    // TODO: Replace 'cmp_consent' with your CMP's consent change event
    consentListener = (e: Event) => {
      const customEvent = e as CustomEvent<CmpConsent>;
      handleConsent(customEvent.detail);
    };
    actualWindow.addEventListener('cmp_consent', consentListener);
  }

  return {
    type: 'cmp-name', // TODO: Your CMP's lowercase identifier
    config: fullConfig,
    push: elb,
    destroy: async () => {
      // Remove all event listeners on cleanup
      // TODO: For callback-based CMPs, restore original functions here
      if (actualWindow && initListener) {
        actualWindow.removeEventListener('cmp_init', initListener);
      }
      if (actualWindow && consentListener) {
        actualWindow.removeEventListener('cmp_consent', consentListener);
      }
    },
  };
};

export default sourceCmpName;
