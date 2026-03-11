import { z } from '@walkeros/core/dev';

/**
 * Demo transformer settings schema.
 *
 * Mirrors: types.ts Settings
 */
export const SettingsSchema = z
  .object({
    name: z
      .string()
      .optional()
      .describe('Custom name for logging prefix. Default: "transformer-demo"'),
    fields: z
      .array(z.string())
      .optional()
      .describe(
        'Dot-notation paths to log from the event. If omitted, logs entire event.',
      ),
    addProcessedFlag: z
      .boolean()
      .optional()
      .describe(
        'If true, adds _processed and _processedBy flags to event.data',
      ),
  })
  .describe('Demo transformer: logs events and optionally adds processed flag');

export type Settings = z.infer<typeof SettingsSchema>;
