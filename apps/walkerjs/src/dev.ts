import { schemas as coreSchemas, type JSONSchema } from '@walkeros/core/dev';

export const schemas: { settings: JSONSchema } = {
  settings: coreSchemas.FlowSchemas.configJsonSchema,
};
