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
 * Packages configuration for build.
 */
export type Packages = Record<string, { version?: string; imports?: string[] }>;

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
   * Shared variables for interpolation.
   * Resolution: process.env > Config.variables > Setup.variables > inline default
   * Syntax: ${VAR_NAME} or ${VAR_NAME:default}
   */
  variables?: Variables;

  /**
   * Reusable configuration definitions.
   * Referenced via JSON Schema $ref syntax: { "$ref": "#/definitions/name" }
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
   * @example
   * "package": "@walkeros/web-source-browser@latest"
   */
  package: string;

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
   *
   * @example
   * "package": "@walkeros/web-destination-gtag@2.0.0"
   */
  package: string;

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
}
