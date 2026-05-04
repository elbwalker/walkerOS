import { z, toJsonSchema } from './validation';
import {
  RequiredString,
  RequiredNumber,
  Identifier,
  Timestamp,
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
export const PropertyTypeSchema: z.ZodTypeAny = z
  .lazy(() =>
    z.union([
      z.boolean(),
      z.string(),
      z.number(),
      z.record(z.string(), PropertySchema),
    ]),
  )
  .meta({
    id: 'WalkerOSPropertyType',
    title: 'WalkerOS.PropertyType',
    description:
      'Base property value types (boolean, string, number, or nested Property record).',
  });

/**
 * Property - PropertyType or array of PropertyType
 * Recursive structure allows nested objects and arrays
 */
export const PropertySchema: z.ZodTypeAny = z
  .lazy(() => z.union([PropertyTypeSchema, z.array(PropertyTypeSchema)]))
  .meta({
    id: 'WalkerOSProperty',
    title: 'WalkerOS.Property',
    description:
      'PropertyType or an array of PropertyType. Recursive structure for nested objects and arrays.',
  });

/**
 * Properties - Record of string keys to Property values
 * Used throughout event structure (data, globals, custom, etc.)
 */
export const PropertiesSchema = z
  .record(z.string(), PropertySchema.optional())
  .meta({
    id: 'WalkerOSProperties',
    title: 'WalkerOS.Properties',
    description: 'Flexible property collection with optional values.',
  })
  .describe('Flexible property collection with optional values');

/**
 * OrderedProperties - Record with [value, order] tuples
 * Used for context data where order matters
 */
export const OrderedPropertiesSchema = z
  .record(z.string(), z.tuple([PropertySchema, z.number()]).optional())
  .meta({
    id: 'WalkerOSOrderedProperties',
    title: 'WalkerOS.OrderedProperties',
    description:
      'Ordered properties with [value, order] tuples for priority control.',
  })
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
  .meta({
    id: 'WalkerOSSourceType',
    title: 'WalkerOS.SourceType',
    description:
      'Source type identifier. Standard: web, server, app, other. Extensible to custom strings.',
  })
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
  .meta({
    id: 'WalkerOSConsent',
    title: 'WalkerOS.Consent',
    description:
      'Consent state mapping. Keys are consent groups (e.g. marketing, functional), values are booleans for granted/denied.',
  })
  .describe('Consent requirement mapping (group name to state)');

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
)
  .meta({
    id: 'WalkerOSUser',
    title: 'WalkerOS.User',
    description: 'User identification and attributes.',
  })
  .describe('User identification and properties');

/**
 * Source - Event source information (v4)
 * Identifies where the event originated. The `type` field is the source kind
 * (browser, dataLayer, gtag, ...). All other fields are optional since each
 * source kind augments this differently via `SourceMap`.
 */
export const SourceSchema = PropertiesSchema.and(
  z.object({
    type: z.string().describe('Source kind (browser, dataLayer, gtag, ...)'),
    platform: z
      .string()
      .optional()
      .describe(
        'Runtime platform (web, server, app, ios, android, terminal, ...)',
      ),
    version: z
      .string()
      .optional()
      .describe('Deployment version of the source emitter'),
    schema: z
      .string()
      .optional()
      .describe('Event model spec version (collector defaults to "4")'),
    count: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe('Emission sequence per run'),
    trace: z.string().optional().describe('W3C traceparent full string'),
    url: z.string().optional(),
    referrer: z.string().optional(),
    tool: z.string().optional(),
    command: z.string().optional(),
  }),
)
  .meta({
    id: 'WalkerOSSource',
    title: 'WalkerOS.Source',
    description: 'Event source information (origin of the event).',
  })
  .describe('Event source information');

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
      nested: z
        .array(EntitySchema)
        .optional()
        .describe('Nested child entities'),
      context: OrderedPropertiesSchema.optional().describe(
        'Entity context data',
      ),
    }),
  )
  .meta({
    id: 'WalkerOSEntity',
    title: 'WalkerOS.Entity',
    description: 'Nested entity structure with recursive nesting support.',
  })
  .describe('Nested entity structure with recursive nesting support');

/**
 * Entities - Array of Entity objects
 */
export const EntitiesSchema = z
  .array(EntitySchema)
  .meta({
    id: 'WalkerOSEntities',
    title: 'WalkerOS.Entities',
    description: 'Array of nested entities.',
  })
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
    id: Identifier.describe('W3C span_id, 16 lowercase hex characters'),
    trigger: RequiredString.describe('Event trigger identifier'),
    entity: RequiredString.describe('Parsed entity from event name'),
    action: RequiredString.describe('Parsed action from event name'),
    timestamp: Timestamp.describe('Unix timestamp in milliseconds since epoch'),
    timing: RequiredNumber.describe('Event processing timing information'),

    // Source tracking (event-model spec version moved to source.schema)
    source: SourceSchema.describe('Event source information'),
  })
  .meta({
    id: 'WalkerOSEvent',
    title: 'WalkerOS.Event',
    description: 'Complete walkerOS event structure.',
  })
  .describe('Complete walkerOS event structure');

/**
 * PartialEvent - Event with all fields optional
 * Used for event creation where not all fields are provided
 */
export const PartialEventSchema = EventSchema.partial()
  .meta({
    id: 'WalkerOSPartialEvent',
    title: 'WalkerOS.PartialEvent',
    description: 'Partial event structure with all fields optional.',
  })
  .describe('Partial event structure with all fields optional');

/**
 * DeepPartialEvent - Event with all fields optional
 * Used for event updates and patches
 *
 * Note: While the TypeScript type uses DeepPartial<Event> for compile-time validation,
 * the Zod schema uses .partial() which makes top-level fields optional. This is
 * sufficient for runtime validation as deeply nested partial objects are rarely
 * provided (users typically omit entire objects rather than providing partial nested data).
 * Zod 4 deliberately removed .deepPartial() due to internal type complexity issues.
 */
export const DeepPartialEventSchema: z.ZodTypeAny = EventSchema.partial()
  .meta({
    id: 'WalkerOSDeepPartialEvent',
    title: 'WalkerOS.DeepPartialEvent',
    description: 'Partial event structure with all top-level fields optional.',
  })
  .describe('Partial event structure with all top-level fields optional');

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
