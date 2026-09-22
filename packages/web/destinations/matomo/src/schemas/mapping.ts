import { schemas, z } from '@walkeros/core/dev';
import { CustomDimensionsSchema } from './settings';

export const MappingSchema = z.object({
  goalId: z
    .string()
    .optional()
    .describe('Goal ID to track a conversion alongside this event (like 1)'),
  goalValue: schemas.ValueSchema.describe(
    'Goal revenue, resolved from the event (like "data.revenue"), passed as the trackGoal revenue',
  ).optional(),
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
  customDimensions: CustomDimensionsSchema.describe(
    'Custom dimensions for this rule, keyed by bare dimension id (like { "3": "data.category" }). Set just before the hit and removed after it; wins per key over the destination customDimensions.',
  ).optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
