import type { Validate, ValidateEvents, JsonSchema } from '@walkeros/core';

export type { ValidateEvents, JsonSchema };

/**
 * Validator settings — alias of the core `Validate` type.
 */
export type ValidatorSettings = Validate;

import type { JSONSchemaType } from 'ajv';
/**
 * Internal AJV-typed alias for AJV API compatibility within this package.
 * Core stays ajv-free; this alias is internal to validator.
 */
export type AjvJsonSchema = Partial<JSONSchemaType<unknown>>;
