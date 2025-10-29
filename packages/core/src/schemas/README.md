# walkerOS Core Schemas

## Overview

This directory contains schema utilities for the walkerOS ecosystem:

1. **Zod Schemas** (`value-config.ts`) - For core ValueConfig types
2. **Schema Builder** (`schema-builder.ts`) - DRY utility for destinations

## Why Two Approaches?

### Zod Schemas (Core Types)

**Use for**: Core mapping types (ValueConfig, Loop, Set, Map)

**Benefits**:

- Runtime validation
- TypeScript type inference
- JSON Schema generation
- Single source of truth

**Location**: `value-config.ts`

**Example**:

```typescript
import { LoopSchema, loopJsonSchema } from '@walkeros/core/schemas';

// Validate
const result = LoopSchema.safeParse(['nested', { map: {...} }]);

// Use JSON Schema in Explorer
const schema = loopJsonSchema; // { type: 'array', minItems: 2, maxItems: 2 }
```

### Schema Builder (Destinations)

**Use for**: Destination Settings/Mapping schemas

**Benefits**:

- NO Zod dependency needed in destination packages
- Simple, declarative API
- DRY - write once in core, use everywhere
- Much less code than hand-written JSON Schema

**Location**: `schema-builder.ts`

**Example**:

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

## Comparison: Hand-written vs Schema Builder

### Before (Hand-written JSON Schema)

```typescript
// 92 lines
export const mappingSchema: RJSFSchema = {
  type: 'object',
  title: 'Meta Pixel Mapping',
  properties: {
    track: {
      type: 'string',
      title: 'Standard Event Name',
      description: 'Meta Pixel standard event name',
      enum: [
        'PageView',
        'AddPaymentInfo',
        'AddToCart',
        // ... 15 more lines
      ],
    },
    trackCustom: {
      type: 'string',
      title: 'Custom Event Name',
      description: 'Custom event name for trackCustom',
    },
  },
};
```

### After (Schema Builder)

```typescript
// ~30 lines
export const mappingSchema = createObjectSchema(
  {
    track: {
      type: 'string',
      description: 'Meta Pixel standard event name',
      enum: [
        'PageView',
        'AddPaymentInfo',
        'AddToCart',
        // ... same enum values
      ],
    },
    trackCustom: {
      type: 'string',
      description: 'Custom event name for trackCustom',
    },
  },
  'Meta Pixel Mapping',
);
```

**Result**: 67% less code, more maintainable!

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

## Property Definition Reference

```typescript
interface PropertyDef {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';

  // Validation
  required?: boolean;
  pattern?: string; // Regex for strings
  minLength?: number; // Min string length
  maxLength?: number; // Max string length
  minimum?: number; // Min number value
  maximum?: number; // Max number value
  enum?: string[] | number[]; // Allowed values

  // Documentation
  description?: string;

  // Nested structures
  properties?: Record<string, PropertyDef>; // For objects
  items?: PropertyDef; // For arrays

  // Default value
  default?: any;
}
```

## Best Practices

### ✅ DO

- Use schema builder for destination schemas
- Keep schema definitions close to types
- Add descriptions for user guidance
- Use enums for fixed value sets
- Use required for mandatory fields

### ❌ DON'T

- Install Zod in destination packages (not needed!)
- Hand-write JSON Schema (use builder instead)
- Duplicate schema logic (DRY!)
- Skip descriptions (help users understand)

## Migration Guide

### From Hand-written JSON Schema

**Before**:

```typescript
export const schema: RJSFSchema = {
  type: 'object',
  properties: {
    field: {
      type: 'string',
      pattern: '^[A-Z]+$',
    },
  },
  required: ['field'],
};
```

**After**:

```typescript
export const schema = createObjectSchema({
  field: {
    type: 'string',
    required: true,
    pattern: '^[A-Z]+$',
  },
});
```

### From Planned Zod Approach

**Before** (would have needed Zod dep):

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const SettingsSchema = z.object({
  pixelId: z.string().regex(/^[0-9]+$/),
});

export const schema = zodToJsonSchema(SettingsSchema);
```

**After** (no Zod dep!):

```typescript
import { createObjectSchema } from '@walkeros/core/schemas';

export const schema = createObjectSchema({
  pixelId: {
    type: 'string',
    pattern: '^[0-9]+$',
  },
});
```

## TypeScript Support

The schema builder is fully typed:

```typescript
const schema = createObjectSchema({
  field: {
    type: 'string',
    pattern: '^[A-Z]+$',
    invalid: true, // ← TypeScript error!
  },
});
```

## Related Documentation

- [RJSF Documentation](https://rjsf-team.github.io/react-jsonschema-form/) -
  JSON Schema reference

## Summary

- **Zod Schemas**: For core types (ValueConfig, Loop, Set, Map)
- **Schema Builder**: For destination schemas (Settings, Mapping)
- **Result**: DRY, type-safe, no extra dependencies in destinations!
