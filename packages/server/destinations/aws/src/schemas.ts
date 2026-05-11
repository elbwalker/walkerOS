// Browser-safe schema-only exports
// This file exports ONLY schemas without any Node.js dependencies

export {
  settings as firehoseSettings,
  mapping as firehoseMapping,
  firehose,
} from './firehose/schemas';

export {
  settings as snsSettings,
  mapping as snsMapping,
  setup as snsSetup,
} from './sns/schemas';

// Backwards-compatible aliases (firehose is the package's default sub-destination).
export { settings, mapping } from './firehose/schemas';
