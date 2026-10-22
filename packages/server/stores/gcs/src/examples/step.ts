import type { Flow } from '@walkeros/core';

/** Read a file using Application Default Credentials (Cloud Run / GKE), file mode. */
export const readWithAdc: Flow.StepExample = {
  title: 'Read with ADC',
  description:
    'Read object from GCS bucket using ADC (no credentials needed), bytes byte-exact',
  in: { operation: 'get', key: 'walker.js' },
  out: [['get', 'walker.js', 'Bytes<(function(){...})()>']],
};

/** Key is scoped under the configured prefix subdirectory. */
export const prefixScoping: Flow.StepExample = {
  title: 'Prefix scoping',
  description:
    'Key "walker.js" with prefix "public/" resolves to GCS path "public/walker.js"',
  in: {
    operation: 'get',
    key: 'walker.js',
    settings: { bucket: 'my-assets', prefix: 'public' },
  },
  out: [['get', 'public/walker.js', 'Bytes<...>']],
};

/** A read that fails is reported, never answered as a miss. */
export const failedRead: Flow.StepExample = {
  public: false,
  description:
    'The request fails (no connection, a refused or forbidden read): get throws a StepError instead of answering a miss, and the collector reports it.',
  in: { operation: 'get', key: 'walker.js' },
  respond: { error: 'network' },
  outcome: { status: 'failed', code: 'transport' },
};
