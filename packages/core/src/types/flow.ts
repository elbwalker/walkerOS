/**
 * Flow Configuration System
 *
 * Core types for walkerOS unified configuration.
 * Platform-agnostic, runtime-focused.
 *
 * The Flow system enables "one config to rule them all" - a single
 * walkeros.config.json file that manages multiple environments
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
 * Complete multi-environment configuration.
 * This is the root type for walkeros.config.json files.
 *
 * @remarks
 * The Setup interface represents the entire configuration file,
 * containing multiple named environments that can share variables
 * and definitions.
 *
 * @example
 * ```json
 * {
 *   "version": 1,
 *   "$schema": "https://walkeros.io/schema/flow/v1.json",
 *   "variables": {
 *     "CURRENCY": "USD"
 *   },
 *   "environments": {
 *     "web_prod": { "platform": "web", ... },
 *     "server_prod": { "platform": "server", ... }
 *   }
 * }
 * ```
 */
export interface Setup {
  /**
   * Configuration schema version.
   * Used for compatibility checks and migrations.
   *
   * @remarks
   * - Version 1: Initial Flow configuration system
   * - Future versions will be documented as they're released
   */
  version: 1;

  /**
   * JSON Schema reference for IDE validation and autocomplete.
   *
   * @remarks
   * When set, IDEs like VSCode will provide:
   * - Autocomplete for all fields
   * - Inline documentation
   * - Validation errors before deployment
   *
   * @example
   * "$schema": "https://walkeros.io/schema/flow/v1.json"
   */
  $schema?: string;

  /**
   * Shared variables for interpolation across all environments.
   *
   * @remarks
   * Variables can be referenced using `${VAR_NAME:default}` syntax.
   * Resolution order:
   * 1. Environment variable (process.env.VAR_NAME)
   * 2. Config variable (config.variables.VAR_NAME)
   * 3. Inline default value
   *
   * @example
   * ```json
   * {
   *   "variables": {
   *     "CURRENCY": "USD",
   *     "GA4_ID": "G-DEFAULT"
   *   },
   *   "environments": {
   *     "prod": {
   *       "collector": {
   *         "globals": {
   *           "currency": "${CURRENCY}"
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  variables?: Record<string, Primitive>;

  /**
   * Reusable configuration definitions.
   *
   * @remarks
   * Definitions can be referenced using JSON Schema `$ref` syntax.
   * Useful for sharing mapping rules, common settings, etc.
   *
   * @example
   * ```json
   * {
   *   "definitions": {
   *     "gtag_base_mapping": {
   *       "page": {
   *         "view": { "name": "page_view" }
   *       }
   *     }
   *   },
   *   "environments": {
   *     "prod": {
   *       "destinations": {
   *         "gtag": {
   *           "config": {
   *             "mapping": { "$ref": "#/definitions/gtag_base_mapping" }
   *           }
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  definitions?: Record<string, unknown>;

  /**
   * Named environment configurations.
   *
   * @remarks
   * Each environment represents a deployment target:
   * - web_prod, web_stage, web_dev (client-side tracking)
   * - server_prod, server_stage (server-side collection)
   *
   * Environment names are arbitrary and user-defined.
   *
   * @example
   * ```json
   * {
   *   "environments": {
   *     "web_prod": {
   *       "platform": "web",
   *       "sources": { ... },
   *       "destinations": { ... }
   *     },
   *     "server_prod": {
   *       "platform": "server",
   *       "destinations": { ... }
   *     }
   *   }
   * }
   * ```
   */
  environments: Record<string, Config>;
}

/**
 * Single environment configuration.
 * Represents one deployment target (e.g., web_prod, server_stage).
 *
 * @remarks
 * This is the core runtime configuration used by `startFlow()`.
 * Platform-agnostic and independent of build/deployment tools.
 *
 * Extensions (build, docker, etc.) are added via `[key: string]: unknown`.
 */
export interface Config {
  /**
   * Target platform for this environment.
   *
   * @remarks
   * - `web`: Browser-based tracking (IIFE bundles, browser sources)
   * - `server`: Node.js server-side collection (CJS bundles, HTTP sources)
   *
   * This determines:
   * - Available packages (web-* vs server-*)
   * - Default build settings
   * - Template selection
   */
  platform: 'web' | 'server';

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
   * Environment-specific variables.
   *
   * @remarks
   * These override root-level variables for this specific environment.
   * Useful for environment-specific API keys, endpoints, etc.
   *
   * @example
   * ```json
   * {
   *   "env": {
   *     "API_ENDPOINT": "https://api.production.com",
   *     "DEBUG": "false"
   *   }
   * }
   * ```
   */
  env?: Record<string, string>;

  /**
   * Extension point for package-specific fields.
   *
   * @remarks
   * Allows packages to add their own configuration fields:
   * - CLI adds `build` field (Bundle.Config)
   * - Docker adds `docker` field (Docker.Config)
   * - Lambda adds `lambda` field (Lambda.Config)
   *
   * Core doesn't validate these fields - packages handle validation.
   */
  [key: string]: unknown;
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
   * Only one source should be marked as primary per environment.
   *
   * @default false
   */
  primary?: boolean;
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
}
