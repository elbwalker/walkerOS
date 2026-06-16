import type { Flow } from '@walkeros/core';
import {
  servicesFullExplicit,
  servicesMinimalExplicit,
  servicesPartialExplicit,
  servicesFirstVisitImplicit,
} from './inputs';
import {
  fullConsentMapped,
  minimalConsentMapped,
  fullConsentCustomMapped,
} from './outputs';

/**
 * Step examples for the Usercentrics V2 path.
 *
 * `in` is the array returned by `window.UC_UI.getServicesBaseInfo()`. The test
 * runner attaches it as the V2 API, then drives the official trigger named in
 * `trigger.options.dispatch`:
 *   - 'init'  (default): UC_UI is present when the source runs, so the static
 *     read at init emits the snapshot (also the `UC_UI_INITIALIZED` path).
 *   - 'cmp': UC_UI is attached only after init, then a `UC_UI_CMP_EVENT`
 *     decision (ACCEPT_ALL) re-reads and emits — the consent-change path.
 */

export const fullConsent: Flow.StepExample = {
  title: 'Full consent',
  description:
    'Usercentrics reports every category accepted via an explicit decision; the source emits a walker consent command granting essential, functional, and marketing.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: servicesFullExplicit,
  out: [['elb', 'walker consent', fullConsentMapped]],
};

export const minimalConsent: Flow.StepExample = {
  title: 'Minimal consent',
  description:
    'A "Deny all" explicit decision leaves only essential granted; functional and marketing are emitted as false.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: servicesMinimalExplicit,
  out: [['elb', 'walker consent', minimalConsentMapped]],
};

export const returningVisitor: Flow.StepExample = {
  title: 'Returning visitor static read',
  description:
    'When the CMP is already initialized with a stored explicit decision, the static read at init re-publishes that choice without any further event.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: servicesPartialExplicit,
  out: [
    [
      'elb',
      'walker consent',
      {
        essential: true,
        functional: true,
        marketing: false,
      },
    ],
  ],
};

export const firstVisitImplicit: Flow.StepExample = {
  title: 'First visit implicit (suppressed)',
  description:
    'A first-visit snapshot carrying only implicit history is suppressed by the default explicitOnly gate, so no consent command is emitted.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: servicesFirstVisitImplicit,
  out: [],
};

export const consentChange: Flow.StepExample = {
  title: 'Consent change via CMP event',
  description:
    'An ACCEPT_ALL decision fires UC_UI_CMP_EVENT; the source re-reads the services and emits the updated consent.',
  trigger: { type: 'consent', options: { dispatch: 'cmp' } },
  in: servicesFullExplicit,
  out: [['elb', 'walker consent', fullConsentMapped]],
};

export const categoryMapOverride: Flow.StepExample = {
  title: 'Category map override',
  description:
    'A custom categoryMap remaps essential to functional and functional to analytics before emitting the walker consent command.',
  trigger: { type: 'consent', options: { dispatch: 'init' } },
  in: servicesFullExplicit,
  mapping: {
    settings: {
      categoryMap: { essential: 'functional', functional: 'analytics' },
    },
  },
  out: [['elb', 'walker consent', fullConsentCustomMapped]],
};
