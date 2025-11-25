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
├── storage.ts + handler.ts ━→  ├── utilities.ts
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
- `VersionSchema` - Walker version info
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

Mirrors [`types/storage.ts`](../types/storage.ts) +
[`types/handler.ts`](../types/handler.ts)

Utility type schemas:

- `StorageTypeSchema` - Storage mechanism enum (local, session, cookie)
- `StorageSchema` - Storage constants
- `ErrorHandlerSchema` - Error handler function
- `LogHandlerSchema` - Log handler function
- `HandlerSchema` - Combined handler interface

**JSON Schema Exports**: `storageTypeJsonSchema`, `errorHandlerJsonSchema`, etc.

### Schema Builder

#### [`schema-builder.ts`](./schema-builder.ts)

**Existing utility** - Kept unchanged

DRY utility for destinations to create JSON Schemas **without Zod dependency**.

Allows destination packages to define schemas without adding Zod to their
dependencies.

## Usage

### Runtime Validation

```typescript
import { EventSchema, ConfigSchema } from '@walkeros/core';

// Validate event data
const result = EventSchema.safeParse(userInput);
if (result.success) {
  const event = result.data;
  // Process validated event
} else {
  console.error('Validation failed:', result.error);
}

// Validate destination config
const configResult = ConfigSchema.safeParse(destConfig);
```

### JSON Schema Generation

```typescript
import { eventJsonSchema, valueConfigJsonSchema } from '@walkeros/core';

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
import { z } from 'zod';
import { EventSchema } from '@walkeros/core';

// Infer TypeScript type from schema
type Event = z.infer<typeof EventSchema>;
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
export const PropertySchema: z.ZodType<any> = z.lazy(() =>
  z.union([PropertyTypeSchema, z.array(PropertyTypeSchema)]),
);
```

**Note**: Use `z.ZodType<any>` to avoid complex type inference issues while
maintaining runtime validation.

### Function Fields

Functions cannot be serialized, so we use `z.any()`:

```typescript
export const InstanceSchema = z.object({
  push: z.any().describe('Push function'),
  init: z.any().optional().describe('Init function'),
  // ...
});
```

This allows the schema to validate structure while accepting any function.

### Loop vs Set Distinction

The mapping system distinguishes Loop from Set using JSON Schema properties:

```typescript
// Loop: z.tuple() generates minItems = 2, maxItems = 2
const LoopSchema = z.tuple([ValueSchema, ValueSchema]);

// Set: z.array() has no minItems/maxItems
const SetSchema = z.array(ValueSchema);
```

Explorer type detector reads these properties to determine the type.

## Migration Notes

### Breaking Change: value-config.ts Reorganization

**What changed**:

- Schemas previously in `value-config.ts` have been moved to `mapping.ts`
- The `value-config.ts` file is now **deprecated** and will be removed

**Impact on imports**:

```typescript
// ✅ Still works (re-exported from index.ts)
import { ValueConfigSchema, LoopSchema } from '@walkeros/core';

// ✅ Also works (explicit import from new location)
import { ValueConfigSchema, LoopSchema } from '@walkeros/core/schemas/mapping';

// ❌ Will stop working in next major version
import { ValueConfigSchema } from '@walkeros/core/schemas/value-config';
```

**Action required**:

- If importing from `@walkeros/core` → No action needed
- If importing directly from `value-config.ts` → Update imports to use
  `mapping.ts`

**Timeline**: `value-config.ts` will be removed in the next major version

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

## Schema Builder (Destinations)

For destination-specific schemas (Settings, Mapping), use the **schema builder**
to avoid adding Zod as a dependency:

```typescript
import { createObjectSchema } from '@walkeros/core/schemas';

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

- No Zod dependency in destination packages
- Simple, declarative API
- Type-safe with TypeScript
- Significantly less code than hand-written JSON Schema

See existing README content below for schema builder documentation.

---

## Resources

- [Zod Documentation](https://zod.dev)
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema)
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

**Important**: This generates `{ type: 'array', minItems: 2, maxItems: 2 }`,
which Explorer's type detector recognizes as a "loop" pattern.

```typescript
const loopSchema = createTupleSchema(
  { type: 'string' },
  { type: 'object' },
  'Loop: [source, transform]',
);
```

## Usage in Destinations

### Step 1: Define Schema

```typescript
// packages/web/destinations/meta/src/schema.ts
import { createObjectSchema } from '@walkeros/core/schemas';

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

### Step 2: Export from Destination

```typescript
// packages/web/destinations/meta/src/index.ts
export { destinationMeta } from './destination';
export { settingsSchema, mappingSchema } from './schema';
```

**NO Zod dependency needed in destination!** ✅

## Best Practices

### ✅ DO

- Use schema builder for destination schemas
- Use Zod schemas (walkeros.ts, mapping.ts, etc.) for core types
- Keep schema definitions close to types
- Add descriptions for user guidance
- Use enums for fixed value sets
- Use required for mandatory fields

### ❌ DON'T

- Install Zod in destination packages (not needed!)
- Hand-write JSON Schema (use builder instead)
- Duplicate schema logic (DRY!)
- Skip descriptions (help users understand)
