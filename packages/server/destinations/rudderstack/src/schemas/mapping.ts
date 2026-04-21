import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { userId?, traits? }. Use with rule-level skip: true on login/identify events.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Per-event group assignment. Resolves to { groupId, traits? }. Use with rule-level skip: true on company/team events.',
    )
    .optional(),
  page: z
    .unknown()
    .describe(
      'Per-event page call. Resolves to { name, properties? } or true for minimal page(). RudderStack requires name (falls back to empty string). Use with skip: true.',
    )
    .optional(),
  screen: z
    .unknown()
    .describe(
      'Per-event screen call (mobile backends). Resolves to { name, properties? } or true for minimal screen(). RudderStack requires name (falls back to empty string). Use with skip: true.',
    )
    .optional(),
  alias: z
    .unknown()
    .describe(
      'Per-event alias call. Resolves to { previousId }. Links anonymous user to identified user. Use with rule-level skip: true.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
