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
 * import { createObjectSchema, createArraySchema } from '@walkeros/core/schemas';
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
 * Builds a top-level JSON Schema object from a map of property definitions.
 *
 * @param properties - Map of property names to their schema definitions (`PropertyDef`)
 * @param title - Optional title to set on the resulting schema
 * @returns The assembled JSON Schema object with `type: "object"`, `properties` populated from `properties`, and `required` set for any properties marked required
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
 * Builds a JSON Schema fragment for a single property definition.
 *
 * Recursively includes nested object properties and array item schemas when the definition
 * describes an object or an array.
 *
 * @param def - The PropertyDef describing the property's type, constraints, defaults and any nested properties/items.
 * @returns A JSON Schema object representing the property, suitable for inclusion in a parent schema's `properties` or `items`.
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
 * Builds a JSON Schema for an array whose items follow the provided property definition.
 *
 * Supports optional constraints: `minItems`, `maxItems`, `description`, and `title`.
 *
 * @param itemDef - Definition for each array item
 * @param options - Optional array constraints (minItems, maxItems, description, title)
 * @returns A JSONSchema describing the array with `items` set to the schema for `itemDef` and any provided constraints
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
 * Builds a JSON Schema that restricts values to the provided enum members.
 *
 * @param values - Allowed enum values
 * @param type - The JSON Schema primitive type for the enum values ('string' or 'number')
 * @param options - Optional metadata such as `description` and `title`
 * @returns A JSON Schema object with `type` and `enum` set to the provided values
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
 * Builds a JSON Schema for a two-element tuple representing a loop pattern.
 *
 * @param firstItem - Definition for the first element (source). Note: the current implementation does not apply this definition to the produced schema.
 * @param secondItem - Definition for the second element (transform). Note: the current implementation does not apply this definition to the produced schema.
 * @param description - Optional description for the tuple schema.
 * @returns A JSON Schema describing an array with exactly two items (`minItems=2`, `maxItems=2`).
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