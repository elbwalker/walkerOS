import type { Flow } from '@walkeros/core';

export interface GeneratorInput {
  flow: Flow.Config;
  cacheOptions?: {
    cacheDir?: string;
    buildDir?: string;
    noCache?: boolean;
    clean?: boolean;
  };
}

export interface GeneratorOutput {
  bundle: string;
}

export class GeneratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'GeneratorError';
  }
}

export class ParseError extends GeneratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}

export class ResolveError extends GeneratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'RESOLVE_ERROR', details);
    this.name = 'ResolveError';
  }
}

export class BundleError extends GeneratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'BUNDLE_ERROR', details);
    this.name = 'BundleError';
  }
}
