import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { userId?, traits? }. Use with rule-level silent: true on login/identify events.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Per-event group assignment. Resolves to { groupId, traits? }. Use with rule-level silent: true on company/team events.',
    )
    .optional(),
  page: z
    .unknown()
    .describe(
      'Per-event page call. Resolves to { name?, properties? }, or true for a page() call without a name. Use with silent: true.',
    )
    .optional(),
  screen: z
    .unknown()
    .describe(
      'Per-event screen call (mobile backends). Resolves to { name?, properties? }, or true for a screen() call without a name. Use with silent: true.',
    )
    .optional(),
  alias: z
    .unknown()
    .describe(
      'Per-event alias call. Resolves to { previousId }. Links that anonymous id to the event userId, which the call needs: an event without a userId fails. Use with rule-level silent: true.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
