import type { Flow } from '@walkeros/core';

/** Read an object from an AWS S3 bucket (file mode, byte-exact). */
export const readAwsS3: Flow.StepExample = {
  title: 'Read from S3',
  description: 'Read object from S3 and receive its raw bytes byte-exact',
  in: { operation: 'get', key: 'walker.js' },
  out: [['get', 'walker.js', 'Bytes<(function(){...})()>']],
};

/** Key is scoped to the configured prefix subdirectory. */
export const prefixScoping: Flow.StepExample = {
  title: 'Prefix scoping',
  description:
    'Key "walker.js" with prefix "public/" resolves to S3 path "public/walker.js"',
  in: {
    operation: 'get',
    key: 'walker.js',
    settings: { bucket: 'my-assets', prefix: 'public' },
  },
  out: [['get', 'public/walker.js', 'Bytes<...>']],
};
