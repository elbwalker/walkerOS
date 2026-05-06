/**
 * Flow Configuration System (v4)
 *
 * Core types for walkerOS unified configuration.
 * Platform-agnostic, runtime-focused.
 *
 * The Flow system enables "one config to rule them all" - a single
 * walkeros.config.json file that manages multiple flows
 * (web_prod, web_stage, server_prod, etc.) with shared configuration
 * and reusable variables.
 *
 * Single declaration merge: `Flow` is both the interface for one flow
 * and the namespace holding all related types.
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
 * The collector is implicit - it is never referenced directly in connections.
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

import type { Collector } from '.';

/**
 * Single flow configuration.
 *
 * Represents one deployment target (e.g., web_prod, server_stage).
 * Platform is determined by `config.platform` ('web' | 'server').
 *
 * Variables cascade: source/destination > flow > root config.
 */
export interface Flow {
  /** Per-flow configuration: platform, url, settings, bundle. */
  config?: Flow.Config;

  /**
   * Source configurations (data capture).
   *
   * Sources capture events from various origins:
   * - Browser DOM interactions (clicks, page views)
   * - DataLayer pushes
   * - HTTP requests (server-side)
   * - Cloud function triggers
   *
   * Key = unique source identifier (arbitrary)
   * Value = source reference with package and config
   */
  sources?: Record<string, Flow.Source>;

  /**
   * Destination configurations (data output).
   *
   * Destinations send processed events to external services:
   * - Google Analytics (gtag)
   * - Meta Pixel (fbq)
   * - Custom APIs
   * - Data warehouses
   *
   * Key = unique destination identifier (arbitrary)
   * Value = destination reference with package and config
   */
  destinations?: Record<string, Flow.Destination>;

  /**
   * Transformer configurations (event transformation).
   *
   * Pre-collector (source.next) or post-collector (destination.before).
   *
   * Key = unique transformer identifier (referenced by source.next or destination.before)
   * Value = transformer reference with package and config
   */
  transformers?: Record<string, Flow.Transformer>;

  /**
   * Store configurations (key-value storage).
   *
   * Stores provide key-value storage consumed by sources, transformers,
   * and destinations via env injection. Referenced using $store.storeId
   * prefix in env values.
   *
   * Key = unique store identifier (arbitrary)
   * Value = store reference with package and config
   */
  stores?: Record<string, Flow.Store>;

  /**
   * Collector configuration (event processing).
   *
   * The collector is the central event processing engine.
   * Configuration includes consent management, global properties,
   * user identification, and processing rules.
   */
  collector?: Collector.InitConfig;

  /**
   * Flow-level variables.
   * Override root variables; overridden by source/destination variables.
   */
  variables?: Flow.Variables;
}

export namespace Flow {
  /**
   * Complete multi-flow configuration.
   * Root type for walkeros.config.json files.
   *
   * If only one flow exists, it's auto-selected without --flow flag.
   * Convention: use "default" as the flow name for single-flow configs.
   *
   * @example
   * ```json
   * {
   *   "version": 4,
   *   "$schema": "https://walkeros.io/schema/flow/v4.json",
   *   "variables": { "CURRENCY": "USD" },
   *   "flows": {
   *     "default": { "config": { "platform": "web" } }
   *   }
   * }
   * ```
   */
  export interface Json {
    /** Configuration schema version. */
    version: 4;

    /**
     * JSON Schema reference for IDE validation.
     * @example "https://walkeros.io/schema/flow/v4.json"
     */
    $schema?: string;

    /**
     * Folders to include in the bundle output.
     * Copied to dist/ during bundle, available at runtime for both local and Docker execution.
     *
     * Use for credential files, configuration, or other runtime assets.
     * Paths are relative to the config file location.
     * Default: `["./shared"]` if the folder exists, otherwise `[]`.
     */
    include?: string[];

    /**
     * Shared variables for interpolation.
     * Resolution: destination/source > flow > root.
     * Syntax: $var.name
     */
    variables?: Variables;

    /**
     * Data contract definition.
     * Entity → action keyed JSON Schema with additive inheritance.
     */
    contract?: Contract;

    /**
     * Named flow configurations.
     * If only one flow exists, it's auto-selected.
     */
    flows: Record<string, Flow>;
  }

  /**
   * Per-flow configuration block.
   *
   * Groups platform identity, optional public URL, arbitrary settings bag,
   * and bundle (build-time) configuration.
   */
  export interface Config {
    /**
     * Platform identity for this flow.
     * - `web` builds to IIFE format, ES2020 target, browser platform.
     * - `server` builds to ESM format, Node18 target, node platform.
     */
    platform: 'web' | 'server';

    /**
     * Public URL where this flow is reachable (for cross-flow `$flow.X.url` references).
     * Set explicitly by the user; the deployment process does not auto-populate it.
     */
    url?: string;

    /**
     * Arbitrary key-value settings consumed by the platform runtime.
     *
     * For web: typical keys include `windowCollector`, `windowElb`.
     * For server: reserved for future server-specific options.
     *
     * This is a free-form bag — type promotion happens later if patterns emerge.
     */
    settings?: Settings;

    /**
     * Bundle configuration: NPM packages to include, transitive dependency overrides.
     * Consumed by the CLI bundler at build time.
     */
    bundle?: Bundle;
  }

  /**
   * Reusable values referenced via `$var.name` (with optional deep paths).
   * Whole-string references preserve native type; inline interpolation requires scalars.
   */
  export type Variables = Record<string, unknown>;

  /**
   * Free-form settings bag inside `Flow.Config.settings`.
   * Mirrors the package settings convention (arbitrary keys).
   */
  export type Settings = Record<string, unknown>;

  /**
   * Bundle configuration for a flow.
   *
   * Groups all build-time bundling concerns: NPM packages to include and
   * transitive dependency overrides. Consumed by the CLI bundler.
   */
  export interface Bundle {
    /** NPM packages to bundle, keyed by package name. */
    packages?: Record<string, BundlePackage>;

    /**
     * Transitive dependency version pins.
     *
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
    overrides?: Record<string, string>;
  }

  /**
   * Single bundle package entry.
   */
  export interface BundlePackage {
    /** Version specifier (e.g., 'latest', '^2.0.0', '2.1.3'). */
    version?: string;
    /** Named imports to expose from the package. */
    imports?: string[];
    /** Local path to package directory (takes precedence over version). */
    path?: string;
  }

  /**
   * Inline code definition for sources/destinations/transformers/stores.
   * Used instead of `package` when defining inline functions.
   */
  export interface Code {
    /** "$code:..." function (required). */
    push: string;
    /** Optional instance type identifier. */
    type?: string;
    /** Optional "$code:..." init function. */
    init?: string;
  }

  /**
   * Source reference with inline package syntax.
   *
   * References a source package and provides configuration.
   * The package is automatically downloaded and imported during build.
   * Alternatively, use `code` (string or inline Code) for inline code execution.
   */
  export interface Source {
    /**
     * Package specifier with optional version.
     *
     * Formats:
     * - `"@walkeros/web-source-browser"` - latest
     * - `"@walkeros/web-source-browser@2.0.0"` - exact
     * - `"@walkeros/web-source-browser@^2.0.0"` - semver range
     *
     * Optional when `code` is used for inline code execution.
     */
    package?: string;

    /**
     * Resolved import variable name (string) or inline code definition (Code).
     *
     * - String: auto-resolved from packages[package].imports[0] during getFlowSettings(),
     *   or provided explicitly for advanced use cases.
     * - Code: object with type, push, and optional init for inline code definition.
     */
    code?: string | Code;

    /**
     * Source-specific configuration. Structure depends on the source package.
     * Passed to the source's initialization function.
     */
    config?: unknown;

    /**
     * Source environment configuration.
     * Environment-specific settings merged with default source environment.
     */
    env?: unknown;

    /**
     * Mark as primary source (provides main ELB).
     *
     * The primary source's ELB function is returned by `startFlow()`.
     * Only one source should be marked as primary per flow.
     *
     * @default false
     */
    primary?: boolean;

    /**
     * First transformer in pre-source chain (consent-exempt).
     *
     * Runs before source.next chain. Consent-exempt because no analytics
     * event exists yet - these transformers handle transport-level preprocessing
     * (decode, validate, authenticate, normalize raw input).
     * Raw request data is available in context.ingest.
     */
    before?: string | string[];

    /**
     * First transformer in pre-collector chain.
     *
     * Name of the transformer to execute after this source captures an event.
     * Creates a pre-collector transformer chain. Chain ends at the collector.
     * If omitted, events route directly to the collector.
     * Can be an array for explicit chain control (bypasses transformer.next resolution).
     */
    next?: string | string[];

    /** Cache configuration for this source. */
    cache?: import('./cache').Cache;

    /**
     * Source-level variables (highest priority in cascade).
     * Overrides flow and root variables.
     */
    variables?: Variables;

    /**
     * Named examples for testing and documentation.
     * Stripped during flow resolution (not included in bundles).
     */
    examples?: StepExamples;
  }

  /**
   * Destination reference with inline package syntax.
   *
   * References a destination package and provides configuration.
   * Structure mirrors `Flow.Source` for consistency.
   */
  export interface Destination {
    /** Package specifier with optional version. Optional when `code` is provided. */
    package?: string;

    /** Resolved import variable name (string) or inline code definition (Code). */
    code?: string | Code;

    /**
     * Destination-specific configuration. Typically includes:
     * - settings: API keys, IDs, endpoints
     * - mapping: Event transformation rules
     * - consent: Required consent states
     * - policy: Processing rules
     */
    config?: unknown;

    /** Destination environment configuration, merged with default destination environment. */
    env?: unknown;

    /**
     * First transformer in post-collector chain.
     *
     * Name of the transformer to execute before sending events to this destination.
     * If omitted, events are sent directly from the collector.
     * Can be an array for explicit chain control.
     */
    before?: string | string[];

    /**
     * First transformer in post-push chain.
     *
     * Runs after destination.push completes. The push response is available
     * at context.ingest._response. Consent is inherited from the destination
     * gate - no separate consent check needed.
     */
    next?: string | string[];

    /** Cache configuration for this destination. */
    cache?: import('./cache').Cache;

    /** Destination-level variables (highest priority in cascade). */
    variables?: Variables;

    /**
     * Named examples for testing and documentation.
     * Stripped during flow resolution.
     */
    examples?: StepExamples;
  }

  /**
   * Transformer reference with inline package syntax.
   *
   * Transformers transform events in the pipeline between sources and destinations.
   * Alternatively, use `code` for inline code execution.
   */
  export interface Transformer {
    /** Package specifier with optional version. Optional when `code` is provided. */
    package?: string;

    /** Resolved import variable name (string) or inline code definition (Code). */
    code?: string | Code;

    /** Transformer-specific configuration. Structure depends on the package. */
    config?: unknown;

    /** Transformer environment configuration. */
    env?: unknown;

    /**
     * Pre-transformer chain.
     *
     * Runs before this transformer's push function.
     * Enables pre-processing or context loading before the main transform.
     * Uses the same chain resolution as source.next and destination.before.
     */
    before?: string | string[];

    /**
     * Next transformer in chain.
     *
     * Name of the next transformer to execute after this one.
     * In a pre-collector chain (source.next), terminates at the collector.
     * In a post-collector chain (destination.before), terminates at the destination.
     * If omitted, the chain ends and control passes to the next pipeline stage.
     * Array values define an explicit chain (no walking). Circular references
     * are safely detected at runtime by `walkChain()`.
     */
    next?: string | string[];

    /** Cache configuration for this transformer. */
    cache?: import('./cache').Cache;

    /** Transformer-level variables (highest priority in cascade). */
    variables?: Variables;

    /**
     * Named examples for testing and documentation.
     * Stripped during flow resolution.
     */
    examples?: StepExamples;
  }

  /**
   * Store reference with inline package syntax.
   *
   * Stores provide key-value storage consumed by other components via env.
   * Unlike sources/transformers/destinations, stores have no chain properties
   * (no `next` or `before`) - they are passive infrastructure.
   */
  export interface Store {
    /** Package specifier with optional version. Optional when `code` is provided. */
    package?: string;

    /** Resolved import variable name (string) or inline code definition (Code). */
    code?: string | Code;

    /** Store-specific configuration. */
    config?: unknown;

    /** Store environment configuration. */
    env?: unknown;

    /** Store-level variables (highest priority in cascade). */
    variables?: Variables;

    /**
     * Named examples for testing and documentation.
     * Stripped during flow resolution.
     */
    examples?: StepExamples;
  }

  /**
   * Named contract map.
   * Each key is a contract name, each value is a contract rule.
   *
   * @example
   * ```json
   * {
   *   "default": { "globals": { ... }, "consent": { ... } },
   *   "web": { "extends": "default", "events": { ... } },
   *   "server": { "extends": "default", "events": { ... } }
   * }
   * ```
   */
  export type Contract = Record<string, ContractRule>;

  /**
   * A single named contract rule.
   *
   * All sections are optional. Sections mirror WalkerOS.Event fields:
   * globals, context, custom, user, consent.
   * Entity-action schemas live under `events`.
   *
   * Use `extends` to inherit from another named contract (additive merge).
   */
  export interface ContractRule {
    /** Inherit from another named contract (additive merge). */
    extends?: string;

    /** Tagging level (used by validators / runtime tagging policy). */
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
   * JSON Schema object for contract rule validation.
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
   * Walker command names that a step example can invoke instead of pushing
   * its `in` as a regular event. Mirrors the `elb('walker <command>', ...)`
   * surface in `WalkerCommands` (see types/elb.ts).
   *
   * - `config` - update collector config (maps to `elb('walker config', in)`)
   * - `consent` - update consent state (maps to `elb('walker consent', in)`)
   * - `user` - update user identification (maps to `elb('walker user', in)`)
   * - `run` - fire run state (maps to `elb('walker run', in)`)
   *
   * Note: `walker destination`, `walker hook`, and `walker on` are
   * intentionally excluded - they configure wiring, not test data.
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
    /** Trigger metadata for sources - type and options for the trigger call. */
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

  /** Named step examples keyed by scenario name. */
  export type StepExamples = Record<string, StepExample>;
}
