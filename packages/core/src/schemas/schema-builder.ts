/**
 * JSON Schema type
 */
export type JSONSchema = Record<string, unknown>;

/**
 * Schema Builder - DRY utility for creating JSON Schemas
 *
 * This utility allows destinations to define schemas using simple objects,
 * without needing Zod as a dependency. The core package handles conversion.
 *
 * Benefits:
 * - Single source of schema generation logic
 * - No Zod dependency in destination packages
 * - Simple, declarative schema definitions
 * - Type-safe with TypeScript
 * - Follows DRY principle
 *
 * @example
 * // In destination package (NO Zod needed!)
 * import { createObjectSchema, createArraySchema } from '@walkeros/core/dev';
 *
 * export const settingsSchema = createObjectSchema({
 *   pixelId: {
 *     type: 'string',
 *     required: true,
 *     pattern: '^[0-9]+$',
 *     description: 'Your Meta Pixel ID',
 *   },
 * });
 */

/**
 * Property definition for schema builder
 */
export interface PropertyDef {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: readonly string[] | readonly number[];
  properties?: Record<string, PropertyDef>;
  items?: PropertyDef;
  default?: unknown;
}

/**
 * Create object schema from property definitions
 *
 * @param properties - Property definitions
 * @param title - Optional schema title
 * @returns JSON Schema
 *
 * @example
 * const schema = createObjectSchema({
 *   pixelId: {
 *     type: 'string',
 *     required: true,
 *     pattern: '^[0-9]+$',
 *     description: 'Your Meta Pixel ID',
 *   },
 *   eventName: {
 *     type: 'string',
 *     enum: ['PageView', 'Purchase'],
 *   },
 * }, 'Meta Pixel Settings');
 */
export function createObjectSchema(
  properties: Record<string, PropertyDef>,
  title?: string,
): JSONSchema {
  const required: string[] = [];
  const schemaProperties: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(properties)) {
    if (def.required) {
      required.push(key);
    }

    const property: Record<string, unknown> = {
      type: def.type,
    };

    if (def.description) property.description = def.description;
    if (def.pattern) property.pattern = def.pattern;
    if (def.minLength !== undefined) property.minLength = def.minLength;
    if (def.maxLength !== undefined) property.maxLength = def.maxLength;
    if (def.minimum !== undefined) property.minimum = def.minimum;
    if (def.maximum !== undefined) property.maximum = def.maximum;
    if (def.enum) property.enum = [...def.enum];
    if (def.default !== undefined) property.default = def.default;

    // Nested object
    if (def.type === 'object' && def.properties) {
      const props: Record<string, unknown> = {};
      for (const [nestedKey, nestedDef] of Object.entries(def.properties)) {
        props[nestedKey] = createPropertySchema(nestedDef);
      }
      property.properties = props;
    }

    // Array
    if (def.type === 'array' && def.items) {
      property.items = createPropertySchema(def.items);
    }

    schemaProperties[key] = property;
  }

  const schema: JSONSchema = {
    type: 'object',
    properties: schemaProperties,
  };

  if (title) schema.title = title;
  if (required.length > 0) schema.required = required;

  return schema;
}

/**
 * Create property schema from definition
 * Helper for nested properties
 */
function createPropertySchema(def: PropertyDef): Record<string, unknown> {
  const property: Record<string, unknown> = {
    type: def.type,
  };

  if (def.description) property.description = def.description;
  if (def.pattern) property.pattern = def.pattern;
  if (def.minLength !== undefined) property.minLength = def.minLength;
  if (def.maxLength !== undefined) property.maxLength = def.maxLength;
  if (def.minimum !== undefined) property.minimum = def.minimum;
  if (def.maximum !== undefined) property.maximum = def.maximum;
  if (def.enum) property.enum = [...def.enum];
  if (def.default !== undefined) property.default = def.default;

  // Nested object
  if (def.type === 'object' && def.properties) {
    const props: Record<string, unknown> = {};
    for (const [key, nestedDef] of Object.entries(def.properties)) {
      props[key] = createPropertySchema(nestedDef);
    }
    property.properties = props;
  }

  // Array
  if (def.type === 'array' && def.items) {
    property.items = createPropertySchema(def.items);
  }

  return property;
}

/**
 * Create array schema
 *
 * @param itemDef - Definition for array items
 * @param options - Optional array constraints
 * @returns JSON Schema
 *
 * @example
 * // Simple string array
 * const tagsSchema = createArraySchema({ type: 'string' });
 *
 * // Tuple (loop pattern) - exactly 2 items
 * const loopSchema = createArraySchema(
 *   { type: 'object' },
 *   { minItems: 2, maxItems: 2 }
 * );
 *
 * // Array with enum
 * const includeSchema = createArraySchema({
 *   type: 'string',
 *   enum: ['data', 'context', 'globals'],
 * });
 */
export function createArraySchema(
  itemDef: PropertyDef,
  options?: {
    minItems?: number;
    maxItems?: number;
    description?: string;
    title?: string;
  },
): JSONSchema {
  const schema: JSONSchema = {
    type: 'array',
    items: createPropertySchema(itemDef),
  };

  if (options?.minItems !== undefined) schema.minItems = options.minItems;
  if (options?.maxItems !== undefined) schema.maxItems = options.maxItems;
  if (options?.description) schema.description = options.description;
  if (options?.title) schema.title = options.title;

  return schema;
}

/**
 * Create enum schema
 *
 * @param values - Allowed values
 * @param type - Value type ('string' or 'number')
 * @param options - Optional constraints
 * @returns JSON Schema
 *
 * @example
 * const eventTypeSchema = createEnumSchema(
 *   ['PageView', 'Purchase', 'AddToCart'],
 *   'string',
 *   { description: 'Meta Pixel standard event' }
 * );
 */
export function createEnumSchema(
  values: readonly string[] | readonly number[],
  type: 'string' | 'number' = 'string',
  options?: {
    description?: string;
    title?: string;
  },
): JSONSchema {
  const schema: JSONSchema = {
    type,
    enum: [...values],
  };

  if (options?.description) schema.description = options.description;
  if (options?.title) schema.title = options.title;

  return schema;
}

/**
 * Create tuple schema (Loop pattern)
 *
 * Creates an array schema with exactly 2 items, which the Explorer
 * type detector recognizes as a "loop" pattern.
 *
 * @param firstItem - Definition for first element (source)
 * @param secondItem - Definition for second element (transform)
 * @param description - Optional description
 * @returns JSON Schema with minItems=2, maxItems=2
 *
 * @example
 * const loopSchema = createTupleSchema(
 *   { type: 'string' },
 *   { type: 'object' },
 *   'Loop: [source, transform]'
 * );
 */
export function createTupleSchema(
  firstItem: PropertyDef,
  secondItem: PropertyDef,
  description?: string,
): JSONSchema {
  return createArraySchema(
    { type: 'object' }, // Generic, items can be different
    {
      minItems: 2,
      maxItems: 2,
      description:
        description || 'Tuple with exactly 2 elements [source, transform]',
    },
  );
}
