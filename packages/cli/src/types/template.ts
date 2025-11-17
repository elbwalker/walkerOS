/**
 * Template Configuration Types
 *
 * Type definitions for template processing and serialization.
 * Used by the template engine and serializer.
 *
 * @packageDocumentation
 */

/**
 * Source or Destination configuration item for templates.
 *
 * @remarks
 * This type is used in template processing where config objects
 * are serialized to JavaScript code.
 */
export interface SourceDestinationItem {
  /**
   * JavaScript code reference (variable name or expression)
   */
  code: string;

  /**
   * Configuration object for the source/destination
   */
  config?: unknown;

  /**
   * Environment-specific variables
   */
  env?: unknown;

  /**
   * Allow additional properties for extensibility
   */
  [key: string]: unknown;
}

/**
 * Template variables that can be used in Handlebars templates.
 *
 * @remarks
 * These variables are available in template files for customization.
 */
export interface TemplateVariables {
  /**
   * Serialized sources configuration
   */
  sources: string;

  /**
   * Serialized destinations configuration
   */
  destinations: string;

  /**
   * Serialized collector configuration
   */
  collector: string;

  /**
   * User-provided code to be inserted
   */
  CODE: string;

  /**
   * Build configuration (optional)
   */
  build?: Record<string, unknown>;
}

/**
 * Processed template variables after serialization.
 *
 * @remarks
 * Internal type used by the serializer to represent processed configs.
 */
export interface ProcessedTemplateVariables {
  /**
   * Processed sources with serialized configs
   */
  sources?: Record<string, TemplateSource>;

  /**
   * Processed destinations with serialized configs
   */
  destinations?: Record<string, TemplateDestination>;

  /**
   * Processed collector configuration
   */
  collector?: Record<string, unknown> | string;

  /**
   * Allow additional properties
   */
  [key: string]: unknown;
}

/**
 * Template source after processing.
 *
 * @internal
 */
export interface TemplateSource {
  code: string;
  config?: unknown | string; // Can be object or serialized string
  env?: unknown;
  [key: string]: unknown;
}

/**
 * Template destination after processing.
 *
 * @internal
 */
export interface TemplateDestination {
  code: string;
  config?: unknown | string; // Can be object or serialized string
  env?: unknown;
  [key: string]: unknown;
}
