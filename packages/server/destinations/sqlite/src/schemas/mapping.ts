import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  table: z
    .string()
    .describe(
      'Override target table name for this rule. Takes precedence over settings.sqlite.table.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
