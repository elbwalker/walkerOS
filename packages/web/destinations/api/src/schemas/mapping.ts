import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
