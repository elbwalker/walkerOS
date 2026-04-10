import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { customId, customSessionId?, customPageId?, friendlyName? } → Clarity.identify(...).',
    )
    .optional(),
  set: z
    .unknown()
    .describe(
      'Explicit custom tag mapping. Resolved object keys become Clarity.setTag(key, value) calls. Array values pass through as string[] unchanged.',
    )
    .optional(),
  upgrade: z
    .unknown()
    .describe(
      'Session priority reason. Resolves to a string → Clarity.upgrade(reason). Used to flag important sessions for retention beyond sampling.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
