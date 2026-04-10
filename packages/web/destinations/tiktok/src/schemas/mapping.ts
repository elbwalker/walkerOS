import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event Advanced Matching mapping. Resolves to an object with any of: email, phone_number, external_id. Overrides destination-level settings.identify for this rule.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
