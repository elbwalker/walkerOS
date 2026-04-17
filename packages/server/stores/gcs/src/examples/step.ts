import type { Flow } from '@walkeros/core';

/** Read a file using Application Default Credentials (Cloud Run / GKE). */
export const readWithAdc: Flow.StepExample = {
  description: 'Read object from GCS bucket using ADC — no credentials needed',
  in: { operation: 'get', key: 'walker.js' },
  out: [['get', 'walker.js', 'Buffer<(function(){...})()>']],
};

/** Key is scoped under the configured prefix subdirectory. */
export const prefixScoping: Flow.StepExample = {
  description:
    'Key "walker.js" with prefix "public/" resolves to GCS path "public/walker.js"',
  in: {
    operation: 'get',
    key: 'walker.js',
    settings: { bucket: 'my-assets', prefix: 'public' },
  },
  out: [['get', 'public/walker.js', 'Buffer<...>']],
};
