import { schemas, z } from '@walkeros/core/dev';
import { CustomDimensionsSchema } from './settings';

export const MappingSchema = z.object({
  goalId: z
    .union([
      z.string().regex(/^[1-9]\d*$/, 'Goal IDs are positive integers like "1"'),
      z.number().int().positive(),
    ])
    .optional()
    .describe(
      'Matomo goal ID, a positive integer like 1. Adds a trackGoal conversion alongside this event',
    ),
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
