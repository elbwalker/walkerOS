import type { Flow } from '@walkeros/core';

/**
 * strict + valid: passes the contract, gets annotated source.valid:true and
 * continues down the chain.
 */
export const strictValidPageView: Flow.StepExample = {
  title: 'Strict validate against a contract (valid)',
  description:
    'A "page view" with the required data.title passes the inline contract. The verdict source.valid:true is written to the event; the chain continues.',
  in: {
    name: 'page view',
    entity: 'page',
    action: 'view',
    data: { title: 'Home' },
  },
  out: [
    [
      'return',
      {
        event: {
          name: 'page view',
          entity: 'page',
          action: 'view',
          data: { title: 'Home' },
          source: { valid: true },
        },
      },
    ],
  ],
};

/**
 * strict + invalid: the same contract, but data.title is missing. In strict
 * mode the transformer stops the chain (drops). Errors are still written to the
 * ingest for observers; the drop itself is encoded as `['return', false]`.
 */
export const strictInvalidPageView: Flow.StepExample = {
  public: false,
  title: 'Strict validate against a contract (invalid, dropped)',
  description:
    'A "page view" missing the required data.title fails the contract. In strict mode the chain stops (event dropped). Validation errors are still written to the ingest for observers.',
  in: {
    name: 'page view',
    entity: 'page',
    action: 'view',
    data: {},
  },
  out: [['return', false]],
};

/**
 * pass + invalid: same failure, but mode:'pass' annotates source.valid:false and
 * continues. Downstream destinations route on event.source.valid. The error list
 * is written to the ingest (default path "validation"), not asserted here.
 */
export const passAnnotateInvalid: Flow.StepExample = {
  public: false,
  title: 'Pass mode annotates an invalid event',
  description:
    'In mode:"pass" an invalid event is not dropped: source.valid:false is written to the event so downstream destinations can route on it, and the error list is written to the ingest path "validation".',
  in: {
    name: 'page view',
    entity: 'page',
    action: 'view',
    data: {},
  },
  out: [
    [
      'return',
      {
        event: {
          name: 'page view',
          entity: 'page',
          action: 'view',
          data: {},
          source: { valid: false },
        },
      },
    ],
  ],
};

/**
 * gtm filter via a contract pattern: the contract rejects names matching
 * ^gtm\\. There is no `ignore` field; filtering is a contract that fails. In
 * strict mode a "gtm.js" event is dropped.
 */
export const gtmFilterDropped: Flow.StepExample = {
  public: false,
  title: 'Filter gtm.* via a contract pattern (dropped)',
  description:
    'A contract whose name must NOT match ^gtm\\. rejects "gtm.js". In strict mode the event is dropped. This is how you filter without an "ignore" field.',
  in: { name: 'gtm.js' },
  out: [['return', false]],
};

/** Same gtm-filter contract, but a real "page view" passes the pattern. */
export const gtmFilterPasses: Flow.StepExample = {
  title: 'Filter gtm.* via a contract pattern (real event passes)',
  description:
    'The same ^gtm\\. rejection contract leaves a real "page view" untouched: it passes and is annotated source.valid:true.',
  in: { name: 'page view', entity: 'page', action: 'view' },
  out: [
    [
      'return',
      {
        event: {
          name: 'page view',
          entity: 'page',
          action: 'view',
          source: { valid: true },
        },
      },
    ],
  ],
};
