// Browser-safe schema-only exports
// This file exports ONLY schemas without any Node.js dependencies
import { settings, mapping, firehose } from './firehose/schemas';

export const schemas = {
  settings,
  mapping,
  firehose,
};
