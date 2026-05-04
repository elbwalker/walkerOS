import { z } from '@walkeros/core/dev';

// Properties schema - flexible key-value pairs
const PropertiesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any())]),
);

// Ordered properties - [value, order] tuples
const OrderedPropertiesSchema = z.record(
  z.string(),
  z.tuple([
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.record(z.string(), z.any()),
    ]),
    z.number(),
  ]),
);

// User schema with optional fields
const UserSchema = z
  .object({
    id: z.string().optional(),
    device: z.string().optional(),
    session: z.string().optional(),
    email: z.string().optional(),
    hash: z.string().optional(),
  })
  .passthrough();

// Consent schema - boolean flags
const ConsentSchema = z.record(z.string(), z.boolean());

// Entity schema (recursive for nested entities)
const EntitySchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      entity: z.string(),
      data: PropertiesSchema.optional(),
      nested: z.array(EntitySchema).optional(),
      context: OrderedPropertiesSchema.optional(),
    })
    .passthrough(),
);

// Source schema (v4)
const SourceSchema = z
  .object({
    type: z.string(),
    platform: z.string().optional(),
    version: z.string().optional(),
    schema: z.string().optional(),
    count: z.number().optional(),
    trace: z.string().optional(),
    url: z.string().optional(),
    referrer: z.string().optional(),
  })
  .passthrough();

// Main event schema - validates incoming events
export const EventSchema = z
  .object({
    // Required
    name: z.string().min(1, 'Event name is required'),

    // Core properties
    data: PropertiesSchema.optional(),
    context: OrderedPropertiesSchema.optional(),
    globals: PropertiesSchema.optional(),
    custom: PropertiesSchema.optional(),
    user: UserSchema.optional(),
    nested: z.array(EntitySchema).optional(),
    consent: ConsentSchema.optional(),

    // System fields (optional for incoming events)
    id: z.string().optional(),
    trigger: z.string().optional(),
    entity: z.string().optional(),
    action: z.string().optional(),
    timestamp: z.number().optional(),
    timing: z.number().optional(),
    source: SourceSchema.optional(),
  })
  .passthrough(); // Allow additional fields

export type ValidatedEvent = z.infer<typeof EventSchema>;
