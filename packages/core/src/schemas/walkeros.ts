import { z, toJsonSchema } from './validation';
import {
  RequiredString,
  RequiredNumber,
  Identifier,
  Timestamp,
  Counter,
  TaggingVersion,
} from './primitives';

/**
 * Core walkerOS Event Model Schemas
 *
 * Mirrors: types/walkeros.ts
 * Purpose: Runtime validation and JSON Schema generation for MCP tools, Explorer UI, and API boundaries
 *
 * These schemas provide:
 * 1. Runtime validation for event data
 * 2. JSON Schema generation for RJSF/Explorer
 * 3. Type documentation via .describe()
 * 4. Compile-time type checking (schemas mirror TypeScript types)
 *
 * Note: TypeScript types in types/walkeros.ts remain the source of truth for development.
 * These Zod schemas are for validation and JSON Schema generation at runtime boundaries.
 */

// ========================================
// Base Property Types (Recursive)
// ========================================

/**
 * PropertyType - Base property value types
 * Can be primitive (boolean, string, number) or nested object with Property values
 */
export const PropertyTypeSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.boolean(),
    z.string(),
    z.number(),
    z.record(z.string(), PropertySchema),
  ]),
);

/**
 * Property - PropertyType or array of PropertyType
 * Recursive structure allows nested objects and arrays
 */
export const PropertySchema: z.ZodTypeAny = z.lazy(() =>
  z.union([PropertyTypeSchema, z.array(PropertyTypeSchema)]),
);

/**
 * Properties - Record of string keys to Property values
 * Used throughout event structure (data, globals, custom, etc.)
 */
export const PropertiesSchema = z
  .record(z.string(), PropertySchema.optional())
  .describe('Flexible property collection with optional values');

/**
 * OrderedProperties - Record with [value, order] tuples
 * Used for context data where order matters
 */
export const OrderedPropertiesSchema = z
  .record(z.string(), z.tuple([PropertySchema, z.number()]).optional())
  .describe(
    'Ordered properties with [value, order] tuples for priority control',
  );

// ========================================
// Enums & Union Types
// ========================================

/**
 * SourceType - Event source identifier
 * Standard types: web, server, app, other
 * Extensible: allows custom string values
 */
export const SourceTypeSchema = z
  .union([z.enum(['web', 'server', 'app', 'other']), z.string()])
  .describe('Source type: web, server, app, other, or custom');

// ========================================
// Event Sub-Types
// ========================================

/**
 * Consent - Consent state mapping
 * Maps consent group names to boolean states
 * Used in Event and Destination/Source configs
 */
export const ConsentSchema = z
  .record(z.string(), z.boolean())
  .describe('Consent requirement mapping (group name → state)');

/**
 * User - User identification and attributes
 * Extends Properties with specific optional fields
 * Contains IDs, demographics, device info, and location data
 */
export const UserSchema = PropertiesSchema.and(
  z.object({
    // IDs
    id: z.string().optional().describe('User identifier'),
    device: z.string().optional().describe('Device identifier'),
    session: z.string().optional().describe('Session identifier'),
    hash: z.string().optional().describe('Hashed identifier'),
    // User attributes
    address: z.string().optional().describe('User address'),
    email: z.string().email().optional().describe('User email address'),
    phone: z.string().optional().describe('User phone number'),
    // Technical attributes
    userAgent: z.string().optional().describe('Browser user agent string'),
    browser: z.string().optional().describe('Browser name'),
    browserVersion: z.string().optional().describe('Browser version'),
    deviceType: z
      .string()
      .optional()
      .describe('Device type (mobile, desktop, tablet)'),
    os: z.string().optional().describe('Operating system'),
    osVersion: z.string().optional().describe('Operating system version'),
    screenSize: z.string().optional().describe('Screen dimensions'),
    // Location attributes
    language: z.string().optional().describe('User language'),
    country: z.string().optional().describe('User country'),
    region: z.string().optional().describe('User region/state'),
    city: z.string().optional().describe('User city'),
    zip: z.string().optional().describe('User postal code'),
    timezone: z.string().optional().describe('User timezone'),
    ip: z.string().optional().describe('User IP address'),
    // Flags
    internal: z
      .boolean()
      .optional()
      .describe('Internal user flag (employee, test user)'),
  }),
).describe('User identification and properties');

/**
 * Version - Walker version information
 * Tracks source implementation and tagging version
 */
export const VersionSchema = PropertiesSchema.and(
  z.object({
    source: RequiredString.describe(
      'Walker implementation version (e.g., "2.0.0")',
    ),
    tagging: TaggingVersion,
  }),
).describe('Walker version information');

/**
 * Source - Event source information
 * Identifies where the event originated
 */
export const SourceSchema = PropertiesSchema.and(
  z.object({
    type: SourceTypeSchema.describe('Source type identifier'),
    id: RequiredString.describe('Source identifier (typically URL on web)'),
    previous_id: RequiredString.describe(
      'Previous source identifier (typically referrer on web)',
    ),
  }),
).describe('Event source information');

/**
 * Entity - Nested entity structure
 * Allows events to contain related entities with their own data and context
 * Recursive: entities can contain nested entities
 */
export const EntitySchema: z.ZodTypeAny = z
  .lazy(() =>
    z.object({
      entity: z.string().describe('Entity name'),
      data: PropertiesSchema.describe('Entity-specific properties'),
      nested: z.array(EntitySchema).describe('Nested child entities'),
      context: OrderedPropertiesSchema.describe('Entity context data'),
    }),
  )
  .describe('Nested entity structure with recursive nesting support');

/**
 * Entities - Array of Entity objects
 */
export const EntitiesSchema = z
  .array(EntitySchema)
  .describe('Array of nested entities');

// ========================================
// Main Event Schema
// ========================================

/**
 * Event - Complete walkerOS event structure
 *
 * Core fields:
 * - name: Event identifier in "entity action" format (e.g., "page view")
 * - data: Event-specific properties
 * - context: Ordered context properties
 * - globals: Global properties shared across events
 * - custom: Custom properties specific to implementation
 * - user: User identification and attributes
 * - nested: Related entities
 * - consent: Consent states at event time
 *
 * System-generated fields:
 * - id: Unique event identifier
 * - timestamp: Event creation time (milliseconds since epoch)
 * - entity: Parsed entity name from event.name
 * - action: Parsed action name from event.name
 * - trigger: Event trigger identifier
 * - timing: Event processing timing information
 * - group: Event grouping identifier
 * - count: Event count in session
 * - version: Walker version information
 * - source: Event source information
 */
export const EventSchema = z
  .object({
    // Core event identification
    name: z
      .string()
      .describe(
        'Event name in "entity action" format (e.g., "page view", "product add")',
      ),

    // Event data
    data: PropertiesSchema.describe('Event-specific properties'),
    context: OrderedPropertiesSchema.describe(
      'Ordered context properties with priorities',
    ),
    globals: PropertiesSchema.describe(
      'Global properties shared across events',
    ),
    custom: PropertiesSchema.describe(
      'Custom implementation-specific properties',
    ),

    // Related data
    user: UserSchema.describe('User identification and attributes'),
    nested: EntitiesSchema.describe('Related nested entities'),
    consent: ConsentSchema.describe('Consent states at event time'),

    // System-generated fields
    id: Identifier.describe('Unique event identifier (timestamp-based)'),
    trigger: RequiredString.describe('Event trigger identifier'),
    entity: RequiredString.describe('Parsed entity from event name'),
    action: RequiredString.describe('Parsed action from event name'),
    timestamp: Timestamp.describe('Unix timestamp in milliseconds since epoch'),
    timing: RequiredNumber.describe('Event processing timing information'),
    group: RequiredString.describe('Event grouping identifier'),
    count: Counter.describe('Event count in session'),

    // Version & source tracking
    version: VersionSchema.describe('Walker version information'),
    source: SourceSchema.describe('Event source information'),
  })
  .describe('Complete walkerOS event structure');

/**
 * PartialEvent - Event with all fields optional
 * Used for event creation where not all fields are provided
 */
export const PartialEventSchema = EventSchema.partial().describe(
  'Partial event structure with all fields optional',
);

/**
 * DeepPartialEvent - Event with deeply nested optional fields
 * Used for event updates and patches
 */
export const DeepPartialEventSchema: z.ZodTypeAny = z
  .lazy(() => EventSchema.deepPartial())
  .describe('Deep partial event structure with all nested fields optional');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const eventJsonSchema = toJsonSchema(EventSchema, 'Event');

export const partialEventJsonSchema = toJsonSchema(
  PartialEventSchema,
  'PartialEvent',
);

export const userJsonSchema = toJsonSchema(UserSchema, 'User');

export const propertiesJsonSchema = toJsonSchema(
  PropertiesSchema,
  'Properties',
);

export const orderedPropertiesJsonSchema = toJsonSchema(
  OrderedPropertiesSchema,
  'OrderedProperties',
);

export const entityJsonSchema = toJsonSchema(EntitySchema, 'Entity');

export const sourceTypeJsonSchema = toJsonSchema(
  SourceTypeSchema,
  'SourceType',
);

export const consentJsonSchema = toJsonSchema(ConsentSchema, 'Consent');
