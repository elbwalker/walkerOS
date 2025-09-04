import type { Collector, Source, Destination, WalkerOS } from '@walkeros/core';

// Generator-specific config types that support string references
export interface GeneratorConfig {
  run?: boolean;
  consent?: WalkerOS.Consent;
  user?: WalkerOS.User;
  tagging?: number;
  globals?: WalkerOS.Properties;
  globalsStatic?: WalkerOS.Properties;
  sessionStatic?: Partial<Collector.SessionData>;
  sources?: GeneratorSources;
  destinations?: GeneratorDestinations;
  custom?: WalkerOS.Properties;
  verbose?: boolean;
  onError?: unknown;
  onLog?: unknown;
}

export interface GeneratorSources {
  [id: string]: GeneratorSourceInit;
}

export interface GeneratorDestinations {
  [id: string]: GeneratorDestinationInit;
}

export interface GeneratorSourceInit {
  code: string | Source.Init;
  config?: Partial<Source.Config>;
  env?: Partial<Source.Environment>;
}

export interface GeneratorDestinationInit {
  code: string | Destination.Init;
  config?: Partial<Destination.Config>;
  env?: Partial<Destination.Environment>;
}

export interface GeneratorInput {
  config: GeneratorConfig;
  packages: PackageDefinition[];
  cacheOptions?: {
    cacheDir?: string;
    buildDir?: string;
    noCache?: boolean;
    clean?: boolean;
  };
}

export interface PackageDefinition {
  name: string;
  version: string;
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
