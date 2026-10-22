import type { Flow } from '@walkeros/core';

/** Read a file that exists in the store directory (file mode, byte-exact). */
export const readExistingFile: Flow.StepExample = {
  title: 'Read file',
  description: 'Read an existing file and receive its raw bytes byte-exact',
  in: { operation: 'get', key: 'walker.js' },
  out: [['get', 'walker.js', 'Bytes<console.log("walkerOS")>']],
};

/** Write a file with auto-created parent directories. */
export const writeNewFile: Flow.StepExample = {
  title: 'Write file',
  description: 'Write creates intermediate directories automatically',
  in: {
    operation: 'set',
    key: 'js/custom/tracker.js',
    value: 'Buffer<(function(){...})()>',
  },
  out: [['set', 'js/custom/tracker.js', 'Buffer<(function(){...})()>']],
};

/** Path traversal attempt is rejected for security. */
export const pathTraversalRejection: Flow.StepExample = {
  public: false,
  description: 'Path traversal via .. segments is rejected with a warning',
  in: { operation: 'get', key: '../../etc/passwd' },
  out: [['get', '../../etc/passwd', undefined]],
};

/** A read that fails for another reason than a missing file. */
export const failedRead: Flow.StepExample = {
  public: false,
  description:
    'The file system fails the read with another error than a missing file (permission denied, a broken disk): get throws a StepError instead of answering a miss.',
  in: { operation: 'get', key: 'private.json' },
  respond: { error: 'network' },
  outcome: { status: 'failed', code: 'transport' },
};
