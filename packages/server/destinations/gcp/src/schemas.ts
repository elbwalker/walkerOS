// Browser-safe schema-only exports
// This file exports ONLY schemas without any Node.js dependencies
export { settings, mapping } from './bigquery/schemas';
export {
  settings as pubsubSettings,
  mapping as pubsubMapping,
  setup as pubsubSetup,
} from './pubsub/schemas';
