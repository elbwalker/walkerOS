import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity override. Resolves to { em?, external_id? } and fires pintrk("set", data) when the resolved value differs from the current state.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
