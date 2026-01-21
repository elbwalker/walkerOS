import { z } from '@walkeros/core/dev';

// Data Manager uses flexible mapping via walkerOS mapping system
// No event-specific mapping schema needed (similar to Meta CAPI pattern)
export const MappingSchema = z.object({});

export type Mapping = z.infer<typeof MappingSchema>;
