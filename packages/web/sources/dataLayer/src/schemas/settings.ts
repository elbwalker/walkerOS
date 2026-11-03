import { z } from '@walkeros/core/dev';
import { JavaScriptVarName, EventPrefix } from './primitives';

/**
 * DataLayer source settings schema
 */
export const SettingsSchema = z.object({
  name: JavaScriptVarName.default('dataLayer')
    .describe('DataLayer variable name (default: dataLayer)')
    .optional(),

  prefix: EventPrefix.default('dataLayer')
    .describe(
      'Entity of every event name: an entry becomes "<prefix> <event>" (default: dataLayer)',
    )
    .optional(),

  filter: z
    .any()
    .describe(
      'Function (entry: unknown) => boolean called with each dataLayer entry; return true to skip the event',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
