import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  goalId: z
    .string()
    .optional()
    .describe('Goal ID to track a conversion alongside this event (like 1)'),
  goalValue: z
    .string()
    .optional()
    .describe('Property path for goal revenue value (like data.revenue)'),
  siteSearch: z
    .boolean()
    .optional()
    .describe('Track as internal site search using trackSiteSearch'),
  contentImpression: z
    .boolean()
    .optional()
    .describe('Track as content impression using trackContentImpression'),
  contentInteraction: z
    .boolean()
    .optional()
    .describe('Track as content interaction using trackContentInteraction'),
  customDimensions: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Per-event custom dimension ID to property path mapping (like { "3": "data.category" })',
    ),
});

export type Mapping = z.infer<typeof MappingSchema>;
