import type { Flow } from '@walkeros/core';

/** Read an object from an AWS S3 bucket. */
export const readAwsS3: Flow.StepExample = {
  description: 'Read object from S3 and receive its contents as a Buffer',
  in: { operation: 'get', key: 'walker.js' },
  out: { value: 'Buffer<(function(){...})()>' },
};

/** Key is scoped to the configured prefix subdirectory. */
export const prefixScoping: Flow.StepExample = {
  description:
    'Key "walker.js" with prefix "public/" resolves to S3 path "public/walker.js"',
  in: {
    operation: 'get',
    key: 'walker.js',
    settings: { bucket: 'my-assets', prefix: 'public' },
  },
  out: { s3Path: 'public/walker.js', value: 'Buffer<...>' },
};
