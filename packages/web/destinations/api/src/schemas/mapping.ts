import { z } from '@walkeros/core/schemas';

export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
