import type { Flow } from '@walkeros/core';

/** Read a file that exists in the store directory. */
export const readExistingFile: Flow.StepExample = {
  description: 'Read an existing file and receive its contents as a Buffer',
  in: { operation: 'get', key: 'walker.js' },
  out: { value: 'Buffer<console.log("walkerOS")>' },
};

/** Write a file with auto-created parent directories. */
export const writeNewFile: Flow.StepExample = {
  description: 'Write creates intermediate directories automatically',
  in: {
    operation: 'set',
    key: 'js/custom/tracker.js',
    value: 'Buffer<(function(){...})()>',
  },
  out: { written: true, path: '{basePath}/js/custom/tracker.js' },
};

/** Path traversal attempt is rejected for security. */
export const pathTraversalRejection: Flow.StepExample = {
  description: 'Path traversal via .. segments is rejected with a warning',
  in: { operation: 'get', key: '../../etc/passwd' },
  out: { value: undefined, rejected: true },
};
