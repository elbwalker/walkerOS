import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ConsentSchema,
  UserSchema,
  PropertiesSchema,
  EventSchema,
} from './walkeros';
import { ConfigSchema as MappingConfigSchema } from './mapping';
import {
  OptionalBoolean,
  RequiredBoolean,
  RequiredNumber,
  OptionalString,
  OptionalIdentifier,
  Timestamp,
  Counter,
  TaggingVersion,
  createOptionalIdSchema,
  createTimestampSchema,
  createCounterSchema,
  createBooleanSchema,
} from './primitives';
import { ErrorHandlerSchema, LogHandlerSchema } from './utilities';

/**
 * Collector Schemas
 *
 * Mirrors: types/collector.ts
 * Purpose: Runtime validation and JSON Schema generation for collector configurations
 *
 * The collector is the central event processing engine in walkerOS:
 * - Receives events from sources
 * - Processes events with consent and context
 * - Routes events to destinations
 * - Manages session state and globals
 * - Handles lifecycle hooks
 *
 * This file defines schemas for collector configuration, commands, and state management.
 */

// ========================================
// Command Type Schema
// ========================================

/**
 * CommandType - Walker command identifiers
 *
 * Standard commands:
 * - action: TODO - need documentation
 * - config: Update collector configuration
 * - consent: Update consent state
 * - context: TODO - need documentation
 * - destination: Add/update destination
 * - elb: TODO - need documentation
 * - globals: Update global properties
 * - hook: Register lifecycle hook
 * - init: Initialize collector
 * - link: TODO - need documentation
 * - run: Start/restart collector with state
 * - user: Update user data
 * - walker: TODO - need documentation
 *
 * Extensible: allows custom command strings
 */
export const CommandTypeSchema = z
  .union([
    z.enum([
      'action',
      'config',
      'consent',
      'context',
      'destination',
      'elb',
      'globals',
      'hook',
      'init',
      'link',
      'run',
      'user',
      'walker',
    ]),
    z.string(), // Allow custom commands
  ])
  .describe(
    'Collector command type: standard commands or custom string for extensions',
  );

// ========================================
// Configuration Schemas
// ========================================

/**
 * Config - Core collector configuration
 *
 * Controls collector behavior:
 * - run: Auto-run on initialization
 * - tagging: Version number for event tagging
 * - globalsStatic: Static globals (persist across runs)
 * - sessionStatic: Static session data (persist across runs)
 * - verbose: Enable verbose logging
 * - onError: Error handler
 * - onLog: Log handler
 */
export const ConfigSchema = z
  .object({
    run: createBooleanSchema(
      'Whether to run collector automatically on initialization',
      true,
    ),
    tagging: TaggingVersion,
    globalsStatic: PropertiesSchema.describe(
      'Static global properties that persist across collector runs',
    ),
    sessionStatic: z
      .record(z.any())
      .describe('Static session data that persists across collector runs'),
    verbose: createBooleanSchema('Enable verbose logging for debugging'),
    // Function handlers
    onError: ErrorHandlerSchema.optional(),
    onLog: LogHandlerSchema.optional(),
  })
  .describe('Core collector configuration');

/**
 * SessionData - Session state management
 *
 * Tracks session-level information:
 * - IDs and lifecycle
 * - Storage state
 * - Marketing tracking
 * - Timestamps
 * - Counters
 *
 * Extends Properties to allow custom session data
 */
export const SessionDataSchema = PropertiesSchema.and(
  z.object({
    isStart: RequiredBoolean.describe('Whether this is a new session start'),
    storage: RequiredBoolean.describe('Whether storage is available'),
    id: createOptionalIdSchema('Session identifier'),
    start: createTimestampSchema('Session start timestamp', true),
    marketing: z
      .literal(true)
      .optional()
      .describe('Marketing attribution flag'),
    updated: createTimestampSchema('Last update timestamp', true),
    isNew: OptionalBoolean.describe('Whether this is a new session'),
    device: createOptionalIdSchema('Device identifier'),
    count: createCounterSchema('Event count in session', true),
    runs: createCounterSchema('Number of runs', true),
  }),
).describe('Session state and tracking data');

/**
 * InitConfig - Initialization configuration
 *
 * Extends Config with initial state:
 * - Initial consent
 * - Initial user data
 * - Initial globals
 * - Source configurations
 * - Destination configurations
 * - Initial custom properties
 */
export const InitConfigSchema = ConfigSchema.partial()
  .extend({
    consent: ConsentSchema.optional().describe('Initial consent state'),
    user: UserSchema.optional().describe('Initial user data'),
    globals: PropertiesSchema.optional().describe('Initial global properties'),
    // Sources and destinations are complex runtime objects
    sources: z.any().optional().describe('Source configurations'),
    destinations: z.any().optional().describe('Destination configurations'),
    custom: PropertiesSchema.optional().describe(
      'Initial custom implementation-specific properties',
    ),
  })
  .describe('Collector initialization configuration with initial state');

// ========================================
// Context Schemas
// ========================================

/**
 * PushContext - Context for collector.push
 *
 * Provides source-level mapping configuration
 * Applied before destination-specific mappings
 */
export const PushContextSchema = z
  .object({
    mapping: MappingConfigSchema.optional().describe(
      'Source-level mapping configuration',
    ),
  })
  .describe('Push context with optional source mapping');

// ========================================
// Collection Schemas
// ========================================

/**
 * Sources - Map of source IDs to instances
 */
export const SourcesSchema = z
  .record(z.string(), z.any())
  .describe('Map of source IDs to source instances');

/**
 * Destinations - Map of destination IDs to instances
 */
export const DestinationsSchema = z
  .record(z.string(), z.any())
  .describe('Map of destination IDs to destination instances');

// ========================================
// Instance Schema
// ========================================

/**
 * Instance - Collector instance (runtime object)
 *
 * The main collector interface with all state and methods
 *
 * State:
 * - config: Current configuration
 * - consent: Current consent state
 * - user: Current user data
 * - globals: Current global properties
 * - custom: Custom properties
 * - session: Session state
 * - sources: Registered sources
 * - destinations: Registered destinations
 * - hooks: Lifecycle hooks
 * - on: Event lifecycle config
 * - queue: Queued events
 *
 * Flags:
 * - allowed: Processing allowed
 * - count: Event count
 * - round: Collector run count
 * - timing: Processing timing
 * - group: Event grouping ID
 *
 * Methods (not validated):
 * - push: Process events
 * - command: Execute commands
 */
export const InstanceSchema = z
  .object({
    // Methods (functions - not validated)
    push: z.any().describe('Push function for processing events'),
    command: z.any().describe('Command function for walker commands'),
    // State
    allowed: z.boolean().describe('Whether event processing is allowed'),
    config: ConfigSchema.describe('Current collector configuration'),
    consent: ConsentSchema.describe('Current consent state'),
    count: z.number().describe('Event count (increments with each event)'),
    custom: PropertiesSchema.describe(
      'Custom implementation-specific properties',
    ),
    sources: SourcesSchema.describe('Registered source instances'),
    destinations: DestinationsSchema.describe(
      'Registered destination instances',
    ),
    globals: PropertiesSchema.describe('Current global properties'),
    group: z.string().describe('Event grouping identifier'),
    hooks: z.any().describe('Lifecycle hook functions'),
    on: z.any().describe('Event lifecycle configuration'),
    queue: z.array(EventSchema).describe('Queued events awaiting processing'),
    round: z
      .number()
      .describe('Collector run count (increments with each run)'),
    session: z
      .union([z.undefined(), SessionDataSchema])
      .describe('Current session state'),
    timing: z.number().describe('Event processing timing information'),
    user: UserSchema.describe('Current user data'),
    version: z.string().describe('Walker implementation version'),
  })
  .describe('Collector instance with state and methods');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const commandTypeJsonSchema = zodToJsonSchema(CommandTypeSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'CommandType',
});

export const configJsonSchema = zodToJsonSchema(ConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'CollectorConfig',
});

export const sessionDataJsonSchema = zodToJsonSchema(SessionDataSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'SessionData',
});

export const initConfigJsonSchema = zodToJsonSchema(InitConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'InitConfig',
});

export const pushContextJsonSchema = zodToJsonSchema(PushContextSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'CollectorPushContext',
});

export const instanceJsonSchema = zodToJsonSchema(InstanceSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'CollectorInstance',
});
