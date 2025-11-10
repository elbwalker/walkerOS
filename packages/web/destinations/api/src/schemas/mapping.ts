import { z } from '@walkeros/core';

export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
