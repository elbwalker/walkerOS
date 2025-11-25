import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { TaggerSchema } from './tagger';

// Export primitives
export * from './primitives';

// Export Zod schemas and types
export { SettingsSchema, type Settings } from './settings';
export { TaggerSchema, type TaggerConfig } from './tagger';

// JSON Schema exports (for website PropertyTable and explorer RJSF)
export const settings = zodToSchema(SettingsSchema);
export const tagger = zodToSchema(TaggerSchema);
