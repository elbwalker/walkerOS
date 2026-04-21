import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  streamKey: z
    .string()
    .optional()
    .describe(
      'Override Redis stream key for this rule. Takes precedence over settings.redis.streamKey.',
    ),
});

export type Mapping = z.infer<typeof MappingSchema>;
