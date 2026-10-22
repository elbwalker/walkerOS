import { schemas as coreSchemas, type JSONSchema } from '@walkeros/core/dev';

export const schemas: { settings: JSONSchema } = {
  settings: coreSchemas.CollectorSchemas.initConfigJsonSchema,
};

export { runExamples } from './dev/runExamples';
export type {
  DestinationRunOptions,
  RunOptions,
  SourceRunOptions,
  StoreRunOptions,
  TransformerRunOptions,
} from './dev/runExamples';
export { conformance, ConformanceError } from './dev/conformance';
export type { ConformanceOptions, Profile } from './dev/conformance';
