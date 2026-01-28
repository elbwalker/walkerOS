/**
 * Flow Configuration System
 *
 * Core types for walkerOS unified configuration.
 * Platform-agnostic, runtime-focused.
 *
 * The Flow system enables "one config to rule them all" - a single
 * walkeros.config.json file that manages multiple flows
 * (web_prod, web_stage, server_prod, etc.) with shared configuration,
 * variables, and reusable definitions.
 *
 * @packageDocumentation
 */

import type { Source, Destination, Collector } from '.';

/**
 * Primitive value types for variables
 */
export type Primitive = string | number | boolean;

/**
 * Variables record type for interpolation.
 * Used at Setup, Config, Source, and Destination levels.
 */
export type Variables = Record<string, Primitive>;

/**
 * Definitions record type for reusable configurations.
 * Used at Setup, Config, Source, and Destination levels.
 */
export type Definitions = Record<string, unknown>;

/**
 * Inline code definition for sources/destinations/transformers.
 * Used instead of package when defining inline functions.
 */
export interface InlineCode {
  push: string; // "$code:..." function (required)
  type?: string; // Optional instance type identifier
  init?: string; // Optional "$code:..." init function
}

/**
 * Packages configuration for build.
 */
export type Packages = Record<
  string,
  {
    version?: string;
    imports?: string[];
    path?: string; // Local path to package directory (takes precedence over version)
  }
>;

/**
 * Web platform configuration.
 *
 * @remarks
 * Presence of this key indicates web platform (browser-based tracking).
 * Builds to IIFE format, ES2020 target, browser platform.
 */
export interface Web {
  /**
   * Window property name for collector instance.
   * @default "collector"
   */
  windowCollector?: string;

  /**
   * Window property name for elb function.
   * @default "elb"
   */
  windowElb?: string;
}

/**
 * Server platform configuration.
 *
 * @remarks
 * Presence of this key indicates server platform (Node.js).
 * Builds to ESM format, Node18 target, node platform.
 * Reserved for future server-specific options.
 */
export interface Server {
  // Reserved for future server-specific options
}

/**
 * Complete multi-flow configuration.
 * Root type for walkeros.config.json files.
 *
 * @remarks
 * If only one flow exists, it's auto-selected without --flow flag.
 * Convention: use "default" as the flow name for single-flow configs.
 *
 * @example
 * ```json
 * {
 *   "version": 1,
 *   "$schema": "https://walkeros.io/schema/flow/v1.json",
 *   "variables": { "CURRENCY": "USD" },
 *   "flows": {
 *     "default": { "web": {}, ... }
 *   }
 * }
 * ```
 */
export interface Setup {
  /**
   * Configuration schema version.
   */
  version: 1;

  /**
   * JSON Schema reference for IDE validation.
   * @example "https://walkeros.io/schema/flow/v1.json"
   */
  $schema?: string;

  /**
   * Folders to include in the bundle output.
   * These folders are copied to dist/ during bundle, making them available
   * at runtime for both local and Docker execution.
   *
   * @remarks
   * Use for credential files, configuration, or other runtime assets.
   * Paths are relative to the config file location.
   * Default: `["./shared"]` if the folder exists, otherwise `[]`.
   *
   * @example
   * ```json
   * {
   *   "include": ["./credentials", "./config"]
   * }
   * ```
   */
  include?: string[];

  /**
   * Shared variables for interpolation.
   * Resolution: destination/source > Config > Setup level
   * Syntax: $var.name
   */
  variables?: Variables;

  /**
   * Reusable configuration definitions.
   * Syntax: $def.name
   */
  definitions?: Definitions;

  /**
   * Named flow configurations.
   * If only one flow exists, it's auto-selected.
   */
  flows: Record<string, Config>;
}

/**
 * Single flow configuration.
 * Represents one deployment target (e.g., web_prod, server_stage).
 *
 * @remarks
 * Platform is determined by presence of `web` or `server` key.
 * Exactly one must be present.
 *
 * Variables/definitions cascade: source/destination > config > setup
 */
export interface Config {
  /**
   * Web platform configuration.
   * Presence indicates web platform (browser-based tracking).
   * Mutually exclusive with `server`.
   */
  web?: Web;

  /**
   * Server platform configuration.
   * Presence indicates server platform (Node.js).
   * Mutually exclusive with `web`.
   */
  server?: Server;

  /**
   * Source configurations (data capture).
   *
   * @remarks
   * Sources capture events from various origins:
   * - Browser DOM interactions (clicks, page views)
   * - DataLayer pushes
   * - HTTP requests (server-side)
   * - Cloud function triggers
   *
   * Key = unique source identifier (arbitrary)
   * Value = source reference with package and config
   *
   * @example
   * ```json
   * {
   *   "sources": {
   *     "browser": {
   *       "package": "@walkeros/web-source-browser",
   *       "config": {
   *         "settings": {
   *           "pageview": true,
   *           "session": true
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  sources?: Record<string, SourceReference>;

  /**
   * Destination configurations (data output).
   *
   * @remarks
   * Destinations send processed events to external services:
   * - Google Analytics (gtag)
   * - Meta Pixel (fbq)
   * - Custom APIs
   * - Data warehouses
   *
   * Key = unique destination identifier (arbitrary)
   * Value = destination reference with package and config
   *
   * @example
   * ```json
   * {
   *   "destinations": {
   *     "gtag": {
   *       "package": "@walkeros/web-destination-gtag",
   *       "config": {
   *         "settings": {
   *           "ga4": { "measurementId": "G-XXXXXXXXXX" }
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  destinations?: Record<string, DestinationReference>;

  /**
   * Transformer configurations (event transformation).
   *
   * @remarks
   * Transformers transform events in the pipeline:
   * - Pre-collector: Between sources and collector
   * - Post-collector: Between collector and destinations
   *
   * Key = unique transformer identifier (referenced by source.next or destination.before)
   * Value = transformer reference with package and config
   *
   * @example
   * ```json
   * {
   *   "transformers": {
   *     "enrich": {
   *       "package": "@walkeros/transformer-enricher",
   *       "config": { "apiUrl": "https://api.example.com" },
   *       "next": "validate"
   *     },
   *     "validate": {
   *       "package": "@walkeros/transformer-validator"
   *     }
   *   }
   * }
   * ```
   */
  transformers?: Record<string, TransformerReference>;

  /**
   * Collector configuration (event processing).
   *
   * @remarks
   * The collector is the central event processing engine.
   * Configuration includes:
   * - Consent management
   * - Global properties
   * - User identification
   * - Processing rules
   *
   * @see {@link Collector.InitConfig} for complete options
   *
   * @example
   * ```json
   * {
   *   "collector": {
   *     "run": true,
   *     "tagging": 1,
   *     "consent": {
   *       "functional": true,
   *       "marketing": false
   *     },
   *     "globals": {
   *       "currency": "USD",
   *       "environment": "production"
   *     }
   *   }
   * }
   * ```
   */
  collector?: Collector.InitConfig;

  /**
   * NPM packages to bundle.
   */
  packages?: Packages;

  /**
   * Flow-level variables.
   * Override Setup.variables, overridden by source/destination variables.
   */
  variables?: Variables;

  /**
   * Flow-level definitions.
   * Extend Setup.definitions, overridden by source/destination definitions.
   */
  definitions?: Definitions;
}

/**
 * Source reference with inline package syntax.
 *
 * @remarks
 * References a source package and provides configuration.
 * The package is automatically downloaded and imported during build.
 * Alternatively, use `code: true` for inline code execution.
 */
export interface SourceReference {
  /**
   * Package specifier with optional version.
   *
   * @remarks
   * Formats:
   * - `"@walkeros/web-source-browser"` - Latest version
   * - `"@walkeros/web-source-browser@2.0.0"` - Specific version
   * - `"@walkeros/web-source-browser@^2.0.0"` - Semver range
   *
   * The CLI will:
   * 1. Parse the package reference
   * 2. Download from npm
   * 3. Auto-detect default or named export
   * 4. Generate import statement
   *
   * Optional when `code: true` is used for inline code execution.
   *
   * @example
   * "package": "@walkeros/web-source-browser@latest"
   */
  package?: string;

  /**
   * Resolved import variable name or built-in code source.
   *
   * @remarks
   * - String: Auto-resolved from packages[package].imports[0] during getFlowConfig(),
   *   or provided explicitly for advanced use cases.
   * - InlineCode: Object with type, push, and optional init for inline code definition.
   *
   * @example
   * // Using inline code object
   * {
   *   "code": {
   *     "type": "logger",
   *     "push": "$code:(event) => console.log(event)"
   *   }
   * }
   */
  code?: string | InlineCode; // string for package import, InlineCode for inline

  /**
   * Source-specific configuration.
   *
   * @remarks
   * Structure depends on the source package.
   * Passed to the source's initialization function.
   *
   * @example
   * ```json
   * {
   *   "config": {
   *     "settings": {
   *       "pageview": true,
   *       "session": true,
   *       "elb": "elb",
   *       "prefix": "data-elb"
   *     }
   *   }
   * }
   * ```
   */
  config?: unknown;

  /**
   * Source environment configuration.
   *
   * @remarks
   * Environment-specific settings for the source.
   * Merged with default source environment.
   */
  env?: unknown;

  /**
   * Mark as primary source (provides main ELB).
   *
   * @remarks
   * The primary source's ELB function is returned by `startFlow()`.
   * Only one source should be marked as primary per flow.
   *
   * @default false
   */
  primary?: boolean;

  /**
   * Source-level variables (highest priority in cascade).
   * Overrides flow and setup variables.
   */
  variables?: Variables;

  /**
   * Source-level definitions (highest priority in cascade).
   * Overrides flow and setup definitions.
   */
  definitions?: Definitions;

  /**
   * First transformer in post-source chain.
   *
   * @remarks
   * Name of the transformer to execute after this source captures an event.
   * If omitted, events route directly to the collector.
   */
  next?: string;
}

/**
 * Transformer reference with inline package syntax.
 *
 * @remarks
 * References a transformer package and provides configuration.
 * Transformers transform events in the pipeline between sources and destinations.
 * Alternatively, use `code: true` for inline code execution.
 */
export interface TransformerReference {
  /**
   * Package specifier with optional version.
   *
   * @remarks
   * Same format as SourceReference.package
   * Optional when `code: true` is used for inline code execution.
   *
   * @example
   * "package": "@walkeros/transformer-enricher@1.0.0"
   */
  package?: string;

  /**
   * Resolved import variable name or built-in code transformer.
   *
   * @remarks
   * - String: Auto-resolved from packages[package].imports[0] during getFlowConfig(),
   *   or provided explicitly for advanced use cases.
   * - InlineCode: Object with type, push, and optional init for inline code definition.
   *
   * @example
   * // Using inline code object
   * {
   *   "code": {
   *     "type": "enricher",
   *     "push": "$code:(event) => ({ ...event, data: { enriched: true } })"
   *   }
   * }
   */
  code?: string | InlineCode; // string for package import, InlineCode for inline

  /**
   * Transformer-specific configuration.
   *
   * @remarks
   * Structure depends on the transformer package.
   * Passed to the transformer's initialization function.
   */
  config?: unknown;

  /**
   * Transformer environment configuration.
   *
   * @remarks
   * Environment-specific settings for the transformer.
   * Merged with default transformer environment.
   */
  env?: unknown;

  /**
   * Next transformer in chain.
   *
   * @remarks
   * Name of the next transformer to execute after this one.
   * If omitted:
   * - Pre-collector: routes to collector
   * - Post-collector: routes to destination
   */
  next?: string;

  /**
   * Transformer-level variables (highest priority in cascade).
   * Overrides flow and setup variables.
   */
  variables?: Variables;

  /**
   * Transformer-level definitions (highest priority in cascade).
   * Overrides flow and setup definitions.
   */
  definitions?: Definitions;
}

/**
 * Destination reference with inline package syntax.
 *
 * @remarks
 * References a destination package and provides configuration.
 * Structure mirrors SourceReference for consistency.
 */
export interface DestinationReference {
  /**
   * Package specifier with optional version.
   *
   * @remarks
   * Same format as SourceReference.package
   * Optional when `code: true` is used for inline code execution.
   *
   * @example
   * "package": "@walkeros/web-destination-gtag@2.0.0"
   */
  package?: string;

  /**
   * Resolved import variable name or built-in code destination.
   *
   * @remarks
   * - String: Auto-resolved from packages[package].imports[0] during getFlowConfig(),
   *   or provided explicitly for advanced use cases.
   * - InlineCode: Object with type, push, and optional init for inline code definition.
   *
   * @example
   * // Using inline code object
   * {
   *   "code": {
   *     "type": "logger",
   *     "push": "$code:(event) => console.log('Event:', event.name)"
   *   }
   * }
   */
  code?: string | InlineCode; // string for package import, InlineCode for inline

  /**
   * Destination-specific configuration.
   *
   * @remarks
   * Structure depends on the destination package.
   * Typically includes:
   * - settings: API keys, IDs, endpoints
   * - mapping: Event transformation rules
   * - consent: Required consent states
   * - policy: Processing rules
   *
   * @example
   * ```json
   * {
   *   "config": {
   *     "settings": {
   *       "ga4": {
   *         "measurementId": "G-XXXXXXXXXX"
   *       }
   *     },
   *     "mapping": {
   *       "page": {
   *         "view": {
   *           "name": "page_view",
   *           "data": { ... }
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  config?: unknown;

  /**
   * Destination environment configuration.
   *
   * @remarks
   * Environment-specific settings for the destination.
   * Merged with default destination environment.
   */
  env?: unknown;

  /**
   * Destination-level variables (highest priority in cascade).
   * Overrides flow and setup variables.
   */
  variables?: Variables;

  /**
   * Destination-level definitions (highest priority in cascade).
   * Overrides flow and setup definitions.
   */
  definitions?: Definitions;

  /**
   * First transformer in pre-destination chain.
   *
   * @remarks
   * Name of the transformer to execute before sending events to this destination.
   * If omitted, events are sent directly from the collector.
   */
  before?: string;
}
