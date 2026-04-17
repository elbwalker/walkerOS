import { z } from '@walkeros/core/dev';

/**
 * dataLayer source rule.settings — describes how to translate an incoming
 * dataLayer push (gtag command, ecommerce event, etc.) into walker command
 * arguments. `command` is a walkerOS Mapping.Value evaluated against the raw
 * dataLayer arguments at capture time.
 */
export const MappingSchema = z.object({
  command: z
    .unknown()
    .describe(
      'Mapping.Value evaluated against the raw dataLayer arguments to build walker command data (e.g. consent updates).',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
