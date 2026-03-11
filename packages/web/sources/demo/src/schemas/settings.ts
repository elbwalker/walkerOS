import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  events: z
    .array(
      z
        .object({
          delay: z
            .number()
            .optional()
            .describe('Milliseconds to wait before pushing this event'),
        })
        .passthrough()
        .describe('Partial walkerOS event with optional delay'),
    )
    .describe('Events to push to the collector on init'),
});

export type Settings = z.infer<typeof SettingsSchema>;
