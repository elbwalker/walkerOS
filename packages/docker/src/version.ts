// Version injected at build time via tsup define (from buildModules)
declare const __VERSION__: string;

/**
 * Package version - exported for use by @walkeros/cli and internal services
 */
export const VERSION =
  typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0';
