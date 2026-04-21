import { z } from '@walkeros/core/dev';

export const MappingSchema = z
  .object({})
  .describe('No per-rule overrides for the file destination.');

export type Mapping = z.infer<typeof MappingSchema>;
