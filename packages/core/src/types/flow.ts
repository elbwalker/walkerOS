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
 * ## Connection Rules
 *
 * Sources use `next` to connect to transformers (pre-collector chain).
 * Sources use `before` for consent-exempt pre-source preprocessing
 * (decode, validate, authenticate raw input before the source.next chain).
 *
 * Destinations use `before` to connect to transformers (post-collector chain).
 * Destinations use `next` for post-push processing.
 *
 * Transformers use `next` to chain to other transformers. The same transformer
 * pool is shared by both pre-collector and post-collector chains.
 *
 * The collector is implicit — it is never referenced directly in connections.
 * It sits between the source chain and the destination chain automatically.
 *
 * Circular `next` references are safely handled at runtime by `walkChain()`
 * in the collector module (visited-set detection).
 *
 * ```
 * Source → [before → Preprocessing] → [next → Transformer chain] → Collector → [before → Transformer chain] → Destination → [next → Post-push]
 * ```
 *
 * @packageDocumentation
 */

import type { Source, Destination, Collector } from '.';

/**
 * JSON Schema object for contract entry validation.
 * Standard JSON Schema with description/examples annotations.
 * Compatible with AJV for runtime validation.
 */
export type ContractSchema = Record<string, unknown>;

/**
 * Contract action entries keyed by action name.
 * Each value is a JSON Schema describing the expected WalkerOS.Event shape.
 * Use "*" as wildcard for all actions of an entity.
 */
export type ContractActions = Record<string, ContractSchema>;

/**
 * Entity-action event map used inside contracts.
 * Keyed by entity name, each value is an action map.
 * Use "*" as wildcard for all entities or all actions.
 */
export type ContractEvents = Record<string, ContractActions>;

/**
 * A single named contract entry.
 *
 * All sections are optional. Sections mirror WalkerOS.Event fields:
 * globals, context, custom, user, consent.
 * Entity-action schemas live under `events`.
 *
 * Use `extends` to inherit from another named contract (additive merge).
 */
export interface ContractEntry {
  /** Inherit from another named contract (additive merge). */
  extends?: string;

  /** Contract version number (syncs to event.version.tagging). */
  tagging?: number;

  /** Human-readable description of the contract. */
  description?: string;

  /** JSON Schema for event.globals. */
  globals?: ContractSchema;

  /** JSON Schema for event.context. */
  context?: ContractSchema;

  /** JSON Schema for event.custom. */
  custom?: ContractSchema;

  /** JSON Schema for event.user. */
  user?: ContractSchema;

  /** JSON Schema for event.consent. */
  consent?: ContractSchema;

  /** Entity-action event schemas. */
  events?: ContractEvents;
}

/**
 * Named contract map.
 * Each key is a contract name, each value is a contract entry.
 *
 * Example:
 * ```json
 * {
 *   "default": { "globals": { ... }, "consent": { ... } },
 *   "web": { "extends": "default", "events": { ... } },
 *   "server": { "extends": "default", "events": { ... } }
 * }
 * ```
 */
export type Contract = Record<string, ContractEntry>;

/**
 * Primitive value types for variables
 */
export type Primitive = string | number | boolean;

/**
 * Variables record type for interpolation.
 * Used at Config, Settings, Source, and Destination levels.
 */
export type Variables = Record<string, Primitive>;

/**
 * Definitions record type for reusable configurations.
 * Used at Config, Settings, Source, and Destination levels.
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
 * Transitive dependency version pins for bundling.
 *
 * @remarks
 * Maps package name → version spec. Applied during bundle package install
 * to force transitive dependencies to a specific version. Useful for
 * resolving conflicts between packages that depend on incompatible
 * versions of a shared dependency.
 *
 * @example
 * ```json
 * {
 *   "@amplitude/analytics-types": "2.11.1"
 * }
 * ```
 */
export type Overrides = Record<string, string>;

/**
 * Bundle configuration for a flow.
 *
 * @remarks
 * Groups all build-time bundling concerns: NPM packages to include and
 * transitive dependency overrides. Consumed by the CLI bundler.
 */
export interface Bundle {
  /** NPM packages to bundle. */
  packages?: Packages;

  /** Transitive dependency version pins. */
  overrides?: Overrides;
}

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
 *   "version": 3,
 *   "$schema": "https://walkeros.io/schema/flow/v3.json",
 *   "variables": { "CURRENCY": "USD" },
 *   "flows": {
 *     "default": { "web": {}, ... }
 *   }
 * }
 * ```
 */
export interface Config {
  /**
   * Configuration schema version.
   */
  version: 3;

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
   * Data contract definition (version 2+).
   * Entity → action keyed JSON Schema with additive inheritance.
   */
  contract?: Contract;

  /**
   * Shared variables for interpolation.
   * Resolution: destination/source > Settings > Config level
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
  flows: Record<string, Settings>;
}

/**
 * Single flow configuration.
 * Represents one deployment target (e.g., web_prod, server_stage).
 *
 * @remarks
 * Platform is determined by presence of `web` or `server` key.
 * Exactly one must be present.
 *
 * Variables/definitions cascade: source/destination > settings > config
 */
export interface Settings {
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
   * Store configurations (key-value storage).
   *
   * @remarks
   * Stores provide key-value storage consumed by sources, transformers,
   * and destinations via env injection. Referenced using $store.storeId
   * prefix in env values.
   *
   * Key = unique store identifier (arbitrary)
   * Value = store reference with package and config
   */
  stores?: Record<string, StoreReference>;

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
   * Bundle configuration (packages to include, transitive overrides).
   *
   * @remarks
   * Groups NPM `packages` and dependency `overrides` used at build time.
   */
  bundle?: Bundle;

  /**
   * Flow-level variables.
   * Override Config.variables, overridden by source/destination variables.
   */
  variables?: Variables;

  /**
   * Flow-level definitions.
   * Extend Config.definitions, overridden by source/destination definitions.
   */
  definitions?: Definitions;
}

/**
 * Walker command names that a step example can invoke instead of pushing
 * its `in` as a regular event. Mirrors the `elb('walker <command>', ...)`
 * surface in `WalkerCommands` (see types/elb.ts).
 *
 * - `config` — update collector config (maps to `elb('walker config', in)`)
 * - `consent` — update consent state (maps to `elb('walker consent', in)`)
 * - `user` — update user identification (maps to `elb('walker user', in)`)
 * - `run` — fire run state (maps to `elb('walker run', in)`)
 *
 * Note: `walker destination`, `walker hook`, and `walker on` are
 * intentionally excluded — they configure wiring, not test data.
 */
export type StepCommand = 'config' | 'consent' | 'user' | 'run';

/** One observable effect: function/method call (`[callable, ...args]`) or return value (`['return', value]`). */
export type StepEffect = readonly [callable: string, ...args: unknown[]];

/** The effects a step produces, in execution order. Empty = no observable effect (filtered, passthrough). */
export type StepOut = readonly StepEffect[];

/**
 * Named example pair for a step.
 * `in` is the input to the step, `out` is the expected output.
 *
 * When `command` is set, the test runner invokes
 * `elb('walker <command>', in)` instead of pushing `in` as a regular event.
 * When `command` is absent (default), `in` is pushed as a normal event via
 * `elb(event)`.
 */
export interface StepExample {
  /** Human-readable title (overrides camelCase-to-spaced default heading in docs). */
  title?: string;
  description?: string;
  /**
   * Whether this example is meant for public consumption (docs, UI, MCP default output).
   * Defaults to `true`. Set to `false` for test-only fixtures that should stay out of
   * user-facing surfaces but still run in test suites and remain available to
   * `flow_simulate` / CLI `--simulate`.
   */
  public?: boolean;
  in?: unknown;
  /** Trigger metadata for sources — type and options for the trigger call. */
  trigger?: {
    /** Which mechanism to activate (e.g., 'click', 'POST', 'load'). */
    type?: string;
    /** Mechanism-specific options (e.g., CSS selector, threshold). */
    options?: unknown;
  };
  mapping?: unknown;
  out?: StepOut;
  /**
   * Invoke a walker command with `in` instead of pushing `in` as an event.
   * When set, the test runner calls `elb('walker <command>', in)`.
   * When absent (default), `in` is pushed as a regular event.
   */
  command?: StepCommand;
}

/**
 * Named step examples keyed by scenario name.
 */
export type StepExamples = Record<string, StepExample>;

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
   * - String: Auto-resolved from packages[package].imports[0] during getFlowSettings(),
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
   * First transformer in pre-collector chain.
   *
   * @remarks
   * Name of the transformer to execute after this source captures an event.
   * Creates a pre-collector transformer chain. Chain ends at the collector.
   * If omitted, events route directly to the collector.
   * Can be an array for explicit chain control (bypasses transformer.next resolution).
   */
  next?: string | string[];

  /**
   * First transformer in pre-source chain (consent-exempt).
   *
   * @remarks
   * Runs before source.next chain. Consent-exempt because no analytics
   * event exists yet — these transformers handle transport-level preprocessing
   * (decode, validate, authenticate, normalize raw input).
   * Raw request data is available in context.ingest.
   */
  before?: string | string[];

  /** Cache configuration for this source. */
  cache?: import('./cache').Cache;

  /**
   * Named examples for testing and documentation.
   * Stripped during flow resolution (not included in bundles).
   */
  examples?: StepExamples;
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
   * - String: Auto-resolved from packages[package].imports[0] during getFlowSettings(),
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
   * Pre-transformer chain.
   *
   * @remarks
   * Runs before this transformer's push function.
   * Enables pre-processing or context loading before the main transform.
   * Uses the same chain resolution as source.next and destination.before.
   */
  before?: string | string[];

  /**
   * Next transformer in chain.
   *
   * @remarks
   * Name of the next transformer to execute after this one.
   * When used in a pre-collector chain (source.next), terminates at the collector.
   * When used in a post-collector chain (destination.before), terminates at the destination.
   * If omitted, the chain ends and control passes to the next pipeline stage.
   * Array values define an explicit chain (no walking). Circular references
   * are safely detected at runtime by `walkChain()`.
   */
  next?: string | string[];

  /** Cache configuration for this transformer. */
  cache?: import('./cache').Cache;

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

  /**
   * Named examples for testing and documentation.
   * Stripped during flow resolution (not included in bundles).
   */
  examples?: StepExamples;
}

/**
 * Store reference with inline package syntax.
 *
 * @remarks
 * References a store package and provides configuration.
 * Stores provide key-value storage consumed by other components via env.
 * Unlike sources/transformers/destinations, stores have no chain properties
 * (no `next` or `before`) — they are passive infrastructure.
 */
export interface StoreReference {
  /**
   * Package specifier with optional version.
   * Optional when `code` is provided for inline code.
   */
  package?: string;

  /**
   * Resolved import variable name or inline code definition.
   */
  code?: string | InlineCode;

  /**
   * Store-specific configuration.
   */
  config?: unknown;

  /**
   * Store environment configuration.
   */
  env?: unknown;

  /**
   * Store-level variables (highest priority in cascade).
   */
  variables?: Variables;

  /**
   * Store-level definitions (highest priority in cascade).
   */
  definitions?: Definitions;

  /**
   * Named examples for testing and documentation.
   * Stripped during flow resolution.
   */
  examples?: StepExamples;
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
   * - String: Auto-resolved from packages[package].imports[0] during getFlowSettings(),
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
   * First transformer in post-collector chain.
   *
   * @remarks
   * Name of the transformer to execute before sending events to this destination.
   * Creates a post-collector transformer chain. Chain ends at this destination.
   * If omitted, events are sent directly from the collector.
   * Can be an array for explicit chain control (bypasses transformer.next resolution).
   */
  before?: string | string[];

  /**
   * First transformer in post-push chain.
   *
   * @remarks
   * Runs after destination.push completes. The push response is available
   * at context.ingest._response. Consent is inherited from the destination
   * gate — no separate consent check needed.
   */
  next?: string | string[];

  /** Cache configuration for this destination. */
  cache?: import('./cache').Cache;

  /**
   * Named examples for testing and documentation.
   * Stripped during flow resolution (not included in bundles).
   */
  examples?: StepExamples;
}
