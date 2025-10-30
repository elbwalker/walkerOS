import { z } from '@walkeros/core';

/**
 * PiwikPro Mapping Schema
 * Event-level mapping configuration for PiwikPro goals and custom tracking
 */
export const MappingSchema = z.object({
  goalId: z
    .string()
    .describe('PiwikPro Goal ID for conversion tracking')
    .optional(),
  goalValue: z
    .string()
    .describe('Mapping key for goal value (e.g., "data.revenue")')
    .optional(),
});

/**
 * Type inference from MappingSchema
 */
export type Mapping = z.infer<typeof MappingSchema>;
