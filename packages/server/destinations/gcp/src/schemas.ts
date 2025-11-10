// Browser-safe schema-only exports
// This file exports ONLY schemas without any Node.js dependencies
import { settings, mapping } from './bigquery/schemas';

export const schemas = {
  settings,
  mapping,
};
