# walkerOS Core Schemas

This directory contains Zod schemas that mirror the TypeScript types defined in
[`../types/`](../types/).

## Purpose

These schemas serve multiple purposes:

1. **Runtime Validation** - Validate data at system boundaries (MCP tools, API
   endpoints, CLI inputs)
2. **JSON Schema Generation** - Generate JSON Schemas for Explorer UI (RJSF) and
   documentation
3. **Type Documentation** - Provide metadata and descriptions for types via
   `.describe()`
4. **MCP Integration** - Enable AI assistants to understand walkerOS types
   through JSON Schema

## Architecture

### Dual Pattern: Types + Schemas

walkerOS uses a **dual pattern** where TypeScript types and Zod schemas coexist:

- **TypeScript types** ([`types/`](../types/)) - Source of truth for development
- **Zod schemas** ([`schemas/`](../schemas/)) - Runtime validation and JSON
  Schema generation

**Why separate?**

- TypeScript types remain clean and compile-time only
- Zod schemas add runtime validation without affecting existing code
- No breaking changes to consumers
- Opt-in adoption at system boundaries

### File Organization

Schemas **mirror the structure** of the types folder:

```
types/                          schemas/
├── walkeros.ts        ━━━━━━→  ├── walkeros.ts
├── mapping.ts         ━━━━━━→  ├── mapping.ts
├── destination.ts     ━━━━━━→  ├── destination.ts
├── collector.ts       ━━━━━━→  ├── collector.ts
├── source.ts          ━━━━━━→  ├── source.ts
├── storage.ts         ━━━━━━→  ├── utilities.ts
└── ...                         └── schema-builder.ts (utility)
```

**Pattern**: If it's in `types/X.ts`, the schema is in `schemas/X.ts`

## Schema Files

### Core Event Model

#### [`walkeros.ts`](./walkeros.ts)

Mirrors [`types/walkeros.ts`](../types/walkeros.ts)

Core event model schemas:

- `EventSchema` - Complete event structure
- `PartialEventSchema` - Partial events for creation
- `PropertiesSchema` - Flexible property collections
- `OrderedPropertiesSchema` - Context properties with ordering
- `UserSchema` - User identification and attributes
- `EntitySchema` - Nested entity structures
- `ConsentSchema` - Consent state mapping
- `SourceTypeSchema` - Event source types (enum)
- `SourceSchema` - Event source metadata

**JSON Schema Exports**: `eventJsonSchema`, `userJsonSchema`,
`propertiesJsonSchema`, etc.

### Mapping System

#### [`mapping.ts`](./mapping.ts)

Mirrors [`types/mapping.ts`](../types/mapping.ts)

Event transformation schemas:

- `ValueSchema` - Core value transformation type (recursive)
- `ValueConfigSchema` - Transformation configuration object
- `LoopSchema` - Array processing (tuple with minItems/maxItems = 2)
- `SetSchema` - Value combination (array without constraints)
- `MapSchema` - Object mapping for structured output
- `RuleSchema` - Event-specific mapping rules
- `RulesSchema` - Nested entity-action mapping tree
- `PolicySchema` - Pre-processing policy rules
- `ConfigSchema` - Shared mapping configuration

**Key Feature**: Loop vs Set distinction via JSON Schema properties
(`minItems`/`maxItems`)

**JSON Schema Exports**: `valueJsonSchema`, `valueConfigJsonSchema`,
`ruleJsonSchema`, etc.

### Component Interfaces

#### [`destination.ts`](./destination.ts)

Mirrors [`types/destination.ts`](../types/destination.ts)

Destination configuration schemas:

- `ConfigSchema` - Destination configuration
- `InstanceSchema` - Runtime destination instance
- `ContextSchema` - Destination context for init/push
- `PushContextSchema` - Push-specific context with mapping
- `BatchSchema` - Batched events for processing
- `DataSchema` - Transformed event data types
- `ResultSchema` - Processing result categorization
- `DLQSchema` - Dead letter queue for failed events

**JSON Schema Exports**: `configJsonSchema`, `contextJsonSchema`,
`batchJsonSchema`, etc.

#### [`collector.ts`](./collector.ts)

Mirrors [`types/collector.ts`](../types/collector.ts)

Collector configuration schemas:

- `ConfigSchema` - Collector configuration
- `InitConfigSchema` - Initialization config with initial state
- `SessionDataSchema` - Session tracking data
- `CommandTypeSchema` - Walker command identifiers (enum)
- `InstanceSchema` - Collector instance with state
- `PushContextSchema` - Context for collector.push

**JSON Schema Exports**: `configJsonSchema`, `sessionDataJsonSchema`,
`commandTypeJsonSchema`, etc.

#### [`source.ts`](./source.ts)

Mirrors [`types/source.ts`](../types/source.ts)

Source configuration schemas:

- `BaseEnvSchema` - Environment dependency injection interface
- `ConfigSchema` - Source configuration
- `InstanceSchema` - Source instance with push handler
- `InitSourceSchema` - Source initialization config
- `InitSourcesSchema` - Map of source initializations

**Key Concept**: Source.push IS the handler (no wrappers needed)

**JSON Schema Exports**: `configJsonSchema`, `instanceJsonSchema`,
`baseEnvJsonSchema`, etc.

### Utilities

#### [`utilities.ts`](./utilities.ts)

Mirrors [`types/storage.ts`](../types/storage.ts)

Utility type schemas:

- `StorageTypeSchema` - Storage mechanism enum (local, session, cookie)
- `StorageSchema` - Storage constants
- `ErrorHandlerSchema` - Error handler function
- `LogHandlerSchema` - Log handler function
- `HandlerSchema` - Combined handler interface

**JSON Schema Exports**: `storageTypeJsonSchema`, `errorHandlerJsonSchema`, etc.

### Schema Builder

#### [`schema-builder.ts`](./schema-builder.ts)

Builds plain JSON Schema objects without Zod.

## Usage

### Runtime Validation

Schemas are exported from `@walkeros/core/dev` under `schemas`, both directly
(common ones such as `EventSchema`) and as namespaces (`DestinationSchemas`,
`MappingSchemas`, ...).

```typescript
import { schemas } from '@walkeros/core/dev';

const { EventSchema, DestinationSchemas } = schemas;

// Validate event data
const result = EventSchema.safeParse(userInput);
if (result.success) {
  const event = result.data;
  // Process validated event
} else {
  console.error('Validation failed:', result.error);
}

// Validate destination config
const configResult = DestinationSchemas.ConfigSchema.safeParse(destConfig);
```

### JSON Schema Generation

```typescript
import { schemas } from '@walkeros/core/dev';

const { eventJsonSchema, valueConfigJsonSchema } = schemas;

// Use in RJSF forms
<Form schema={eventJsonSchema} />

// Use in MCP tool definitions
server.tool({
  name: 'walker_track_event',
  inputSchema: eventJsonSchema,
  handler: async (args) => { ... }
});
```

### Type Inference

```typescript
import { schemas, z } from '@walkeros/core/dev';

// Infer TypeScript type from schema
type Event = z.infer<typeof schemas.EventSchema>;
```

## Naming Convention

Strict naming pattern for consistency:

### Zod Schemas (PascalCase + "Schema")

```typescript
export const EventSchema = z.object({ ... });
export const UserSchema = z.object({ ... });
export const SourceTypeSchema = z.enum([...]);
```

**Pattern**: `{TypeName}Schema` (exact match to type name)

### JSON Schemas (camelCase + "JsonSchema")

```typescript
export const eventJsonSchema = toJsonSchema(EventSchema, ...);
export const userJsonSchema = toJsonSchema(UserSchema, ...);
export const sourceTypeJsonSchema = toJsonSchema(SourceTypeSchema, ...);
```

**Pattern**: `{typeName}JsonSchema`

## Design Decisions

### Enums vs Simple Fields

**Create schemas for:**

- ✅ Enums with semantic meaning: `SourceTypeSchema`, `StorageTypeSchema`,
  `CommandTypeSchema`
- ✅ Reusable composites: `PropertiesSchema`, `UserSchema`, `EntitySchema`
- ✅ Complex structures: `EventSchema`, `ConfigSchema`, `RuleSchema`

**Don't create schemas for:**

- ❌ Simple system fields: `id`, `timestamp`, `count` (inline in parent schema)
- ❌ One-off primitives without validation logic

### Recursive Types

Recursive schemas use `z.lazy()` to handle circular dependencies:

```typescript
export const PropertySchema: z.ZodTypeAny = z.lazy(() =>
  z.union([PropertyTypeSchema, z.array(PropertyTypeSchema)]),
);
```

**Note**: The `z.ZodTypeAny` annotation avoids complex recursive type inference
while keeping runtime validation.

### Function Fields

Functions cannot be serialized, so we use `z.unknown()`:

```typescript
export const InstanceSchema = z.object({
  push: z.unknown().describe('Push function for single events'),
  init: z.unknown().optional().describe('Initialization function'),
  // ...
});
```

This allows the schema to validate structure while accepting any function.

### Loop vs Set Distinction

The mapping system distinguishes Loop from Set using JSON Schema properties:

```typescript
// Loop: a tuple whose meta sets minItems = 2, maxItems = 2
const LoopSchema = z
  .lazy(() => z.tuple([ValueSchema, ValueSchema]))
  .meta({ id: 'MappingLoop', title: 'Mapping.Loop', minItems: 2, maxItems: 2 });

// Set: z.array() has no minItems/maxItems
const SetSchema = z.lazy(() => z.array(ValueSchema));
```

## Mapping Value Schemas

All mapping value schemas (`ValueSchema`, `ValueConfigSchema`, `LoopSchema`,
`SetSchema`, `MapSchema`) live in `mapping.ts`. Import them from
`@walkeros/core/dev`: `schemas.ValueSchema` or the `schemas.MappingSchemas`
namespace.

## Schema Type Naming

Every exported schema must carry `.meta({ id, title, description })` so the
generated JSON Schema can link back to the canonical TypeScript name:

- **id** - PascalCase, namespace-prefixed to avoid collisions
  (`DestinationConfig`, `CollectorPushContext`, `LoggerConfig`).
- **title** - dotted form matching the VS Code TS hover (`Destination.Config`,
  `Collector.PushContext`, `Logger.Config`).
- **description** - 1-2 sentences describing the type.

Reference implementation: `ConsentSchema` in `walkeros.ts`. Coverage is enforced
by `__tests__/meta-coverage.test.ts`.

## Development Guidelines

### Adding New Schemas

1. **Create schema in corresponding file** (mirror types folder structure)
2. **Use strict naming**: `{TypeName}Schema` and `{typeName}JsonSchema`
3. **Add descriptions**: Use `.describe()` for documentation
4. **Generate JSON Schema**: Export both Zod and JSON Schema versions
5. **Export from index.ts**: Add to appropriate section
6. **Document in README**: Add to relevant section above

### Schema Validation

Schemas should validate:

- **Structure** - Required fields, types, nesting
- **Semantic constraints** - Enums, formats (email), ranges
- **Business rules** - Custom refinements (e.g., "must have at least one
  property")

Schemas should NOT validate:

- **Runtime logic** - Business logic belongs in code, not schemas
- **Performance constraints** - Not a schema concern
- **External dependencies** - Can't validate what external APIs return

### Testing Schemas

Test schemas by:

1. **Valid inputs** - Ensure valid data passes
2. **Invalid inputs** - Ensure invalid data fails with clear errors
3. **Edge cases** - Empty objects, null values, deeply nested structures
4. **Type alignment** - Verify schema matches TypeScript type
5. **JSON Schema generation** - Ensure JSON Schema is valid

## Package Schemas (Destinations, Sources, Transformers)

Packages define their settings and mapping schemas with Zod in `src/schemas/`,
importing `z` from `@walkeros/core/dev`, so they need no direct Zod dependency.
`zodToSchema` converts them to the JSON Schemas the package exports:

```typescript
// src/schemas/settings.ts
import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  pixelId: z.string().describe('Your Meta Pixel ID (like 1234567890)'),
});

// src/schemas/index.ts
import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';

export const settings = zodToSchema(SettingsSchema);
```

## Schema Builder

To build a plain JSON Schema without Zod, use the **schema builder**:

```typescript
import { schemas } from '@walkeros/core/dev';

const { createObjectSchema } = schemas;

export const settingsSchema = createObjectSchema(
  {
    pixelId: {
      type: 'string',
      required: true,
      pattern: '^[0-9]+$',
      description: 'Your Meta Pixel ID',
    },
  },
  'Meta Pixel Settings',
);
```

**Benefits**:

- No Zod needed
- Simple, declarative API
- Type-safe with TypeScript
- Significantly less code than hand-written JSON Schema

See the Schema Builder API below.

---

## Resources

- [Zod Documentation](https://zod.dev)
- [JSON Schema Specification](https://json-schema.org/)
- [RJSF (React JSON Schema Form)](https://rjsf-team.github.io/react-jsonschema-form/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)

---

**Note**: Schemas are for **runtime validation and tooling**. TypeScript types
in [`types/`](../types/) remain the source of truth for development.

---

# Schema Builder Documentation

## Schema Builder API

### `createObjectSchema(properties, title?)`

Creates an object schema with type-safe property definitions.

```typescript
const schema = createObjectSchema(
  {
    // String with pattern
    pixelId: {
      type: 'string',
      required: true,
      pattern: '^[0-9]+$',
      description: 'Pixel ID',
    },

    // Enum
    eventType: {
      type: 'string',
      enum: ['PageView', 'Purchase'],
    },

    // Number with constraints
    timeout: {
      type: 'number',
      minimum: 0,
      maximum: 5000,
      default: 1000,
    },

    // Nested object
    advanced: {
      type: 'object',
      properties: {
        debug: { type: 'boolean' },
        retries: { type: 'number' },
      },
    },

    // Array
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  'My Schema Title',
);
```

### `createArraySchema(itemDef, options?)`

Creates an array schema with item constraints.

```typescript
// Simple string array
const tagsSchema = createArraySchema({ type: 'string' });

// Tuple (Loop pattern) - exactly 2 items
const loopSchema = createArraySchema(
  { type: 'object' },
  { minItems: 2, maxItems: 2, description: 'Loop: [source, transform]' },
);

// Array with enum items
const includeSchema = createArraySchema({
  type: 'string',
  enum: ['data', 'context', 'globals'],
});
```

### `createEnumSchema(values, type?, options?)`

Creates an enum schema.

```typescript
const eventTypeSchema = createEnumSchema(
  ['PageView', 'Purchase', 'AddToCart'],
  'string',
  { description: 'Standard event types' },
);
```

### `createTupleSchema(firstItem, secondItem, description?)`

Creates a tuple schema (Loop pattern).

**Important**: This generates `{ type: 'array', minItems: 2, maxItems: 2 }`, the
same length constraint the Loop mapping schema carries.

```typescript
const loopSchema = createTupleSchema(
  { type: 'string' },
  { type: 'object' },
  'Loop: [source, transform]',
);
```

## Best Practices

### ✅ DO

- Define package schemas with `z` from `@walkeros/core/dev`
- Use Zod schemas (walkeros.ts, mapping.ts, etc.) for core types
- Keep schema definitions close to types
- Add descriptions for user guidance
- Use enums for fixed value sets
- Use required for mandatory fields

### ❌ DON'T

- Add Zod as a direct dependency of a destination, source, or transformer
  package (import `z` from `@walkeros/core/dev`)
- Hand-write JSON Schema (use `zodToSchema` or the schema builder instead)
- Duplicate schema logic (DRY!)
- Skip descriptions (help users understand)
