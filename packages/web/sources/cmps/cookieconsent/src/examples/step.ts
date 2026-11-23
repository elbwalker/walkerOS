import type { Flow } from '@walkeros/core';
import * as inputs from './inputs';
import * as outputs from './outputs';

/**
 * Step examples for the CookieConsent source.
 *
 * `in` is what `window.CookieConsent` answers: `valid` for `validConsent()`
 * and `preferences` for `getUserPreferences()`. `trigger.options.dispatch`
 * picks the path the source reacts to:
 *   - 'init' (default): CookieConsent already holds the state when the source
 *     starts, so the static read at init publishes it.
 *   - 'consent': CookieConsent reports a decision after the source started
 *     and fires cc:onConsent.
 *   - 'change': the visitor changes an earlier decision and CookieConsent
 *     fires cc:onChange.
 */

export const acceptAll: Flow.StepExample = {
  title: 'Accept all',
  description:
    'The visitor clicks Accept all. CookieConsent fires cc:onConsent and the source grants necessary, analytics and marketing.',
  trigger: { type: 'consent', options: { dispatch: 'consent' } },
  in: inputs.acceptAll,
  out: [['elb', 'walker consent', outputs.acceptAllMapped]],
};

export const rejectAll: Flow.StepExample = {
  title: 'Reject all',
  description:
    'The visitor clicks Reject all. Only the read-only necessary category stays accepted, and the source sends analytics and marketing as false.',
  trigger: { type: 'consent', options: { dispatch: 'consent' } },
  in: inputs.rejectAll,
  out: [['elb', 'walker consent', outputs.rejectAllMapped]],
};

export const returningVisitor: Flow.StepExample = {
  title: 'Returning visitor',
  description:
    'CookieConsent restored a valid choice before the source started, so the static read at init publishes it.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: inputs.analyticsOnly,
  out: [['elb', 'walker consent', outputs.analyticsOnlyMapped]],
};

export const preferencesChange: Flow.StepExample = {
  title: 'Preferences change',
  description:
    'The visitor withdraws analytics and ads in the preferences. CookieConsent fires cc:onChange and the source sends both groups as false.',
  trigger: { type: 'consent', options: { dispatch: 'change' } },
  in: inputs.rejectAll,
  out: [['elb', 'walker consent', outputs.rejectAllMapped]],
};

export const firstVisit: Flow.StepExample = {
  title: 'First visit',
  description:
    'The banner is open and CookieConsent holds no valid choice, so the source sends nothing until the visitor decides.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: inputs.noChoice,
  out: [],
};

export const optOutDefaults: Flow.StepExample = {
  title: 'Opt-out defaults',
  description:
    'In opt-out mode CookieConsent enables default categories before a choice. That is no decision, so the source sends nothing until the visitor decides.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: inputs.optOutDefaults,
  out: [],
};

export const categoryMapOverride: Flow.StepExample = {
  title: 'Category map override',
  description:
    'A custom categoryMap reports the analytics category as a statistics group.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: inputs.analyticsOnly,
  mapping: { settings: { categoryMap: { analytics: 'statistics' } } },
  out: [['elb', 'walker consent', outputs.analyticsOnlyCustomMapped]],
};

export const customCategoryPassThrough: Flow.StepExample = {
  title: 'Custom category',
  description:
    'A site category without a map entry, here functionality, is reported under its own name.',
  trigger: { type: 'consent', options: { dispatch: 'consent' } },
  in: inputs.customCategory,
  out: [['elb', 'walker consent', outputs.customCategoryMapped]],
};
