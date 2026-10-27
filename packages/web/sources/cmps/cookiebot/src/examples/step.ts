import type { Flow } from '@walkeros/core';
import {
  fullConsent,
  partialConsent,
  necessaryOnly,
  impliedConsent,
  noResponse,
} from './inputs';
import {
  fullConsentMapped,
  partialConsentMapped,
  necessaryOnlyMapped,
  partialConsentCustomMapped,
} from './outputs';

/**
 * Step examples for the Cookiebot source.
 *
 * `in` is the `window.Cookiebot` state. `trigger.options.dispatch` picks the
 * path the source reacts to:
 *   - 'init' (default): Cookiebot already holds the state when the source
 *     starts, so the static read at init emits it.
 *   - 'event': Cookiebot reports the state after the source started, firing
 *     CookiebotOnAccept (consented) or CookiebotOnDecline (declined).
 */

export const allowAll: Flow.StepExample = {
  title: 'Allow all',
  description:
    'The visitor clicks "Allow all". Cookiebot fires CookiebotOnAccept and the source emits a walker consent command granting functional, analytics and marketing.',
  trigger: { type: 'consent', options: { dispatch: 'event' } },
  in: fullConsent,
  out: [['elb', 'walker consent', fullConsentMapped]],
};

export const necessaryOnlyChoice: Flow.StepExample = {
  title: 'Necessary only',
  description:
    'The visitor clicks "Use necessary cookies only". Cookiebot fires CookiebotOnDecline and the source emits functional, analytics and marketing as false.',
  trigger: { type: 'consent', options: { dispatch: 'event' } },
  in: necessaryOnly,
  out: [['elb', 'walker consent', necessaryOnlyMapped]],
};

export const returningVisitor: Flow.StepExample = {
  title: 'Returning visitor',
  description:
    'Cookiebot already restored a stored choice when the source starts, so the static read at init publishes it at once.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: partialConsent,
  out: [['elb', 'walker consent', partialConsentMapped]],
};

export const firstVisit: Flow.StepExample = {
  title: 'First visit',
  description:
    'The banner is still open and Cookiebot holds no response, so the source emits no consent command until the visitor decides.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: noResponse,
  out: [],
};

export const impliedSkipped: Flow.StepExample = {
  title: 'Implied consent (skipped)',
  description:
    'Cookiebot consented on its own (consent.method implied), for example outside the regions where the site asks. The default explicitOnly publishes only an explicit decision, so no consent command is emitted, and a visitor Cookiebot never asks never sends one.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: impliedConsent,
  out: [],
};

export const impliedAllowed: Flow.StepExample = {
  title: 'Implied consent (explicitOnly off)',
  description:
    'With explicitOnly set to false the source follows the consent Cookiebot implied and grants every group.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: impliedConsent,
  mapping: { settings: { explicitOnly: false } },
  out: [['elb', 'walker consent', fullConsentMapped]],
};

export const categoryMapOverride: Flow.StepExample = {
  title: 'Category map override',
  description:
    'A custom categoryMap reports Cookiebot statistics as a statistics group instead of analytics.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: partialConsent,
  mapping: { settings: { categoryMap: { statistics: 'statistics' } } },
  out: [['elb', 'walker consent', partialConsentCustomMapped]],
};
