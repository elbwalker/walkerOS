import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { distinctId, $set?, $set_once? }. Fires client.identify() when $set/$set_once present.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Group assignment. Resolves to { type, key, properties? }. Fires client.groupIdentify() when properties present, adds groups to capture().',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
