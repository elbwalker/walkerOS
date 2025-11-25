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
    .describe('Event prefix for filtering which events to process')
    .optional(),

  filter: z
    .any()
    .describe(
      'Custom filter function: (event: unknown) => boolean | Promise<boolean>',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
