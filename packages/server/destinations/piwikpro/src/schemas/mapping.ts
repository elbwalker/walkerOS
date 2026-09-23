import { schemas, z } from '@walkeros/core/dev';
import { CustomDimensionsSchema } from './settings';

export const MappingSchema = z.object({
  goalId: z
    .union([z.string(), z.number()])
    .describe(
      'Piwik PRO goal id (UUID or legacy integer). Adds a second hit, trackGoal, to the same request.',
    )
    .optional(),
  goalValue: schemas.ValueSchema.describe(
    'Goal revenue, a mapping value resolved against the event (like "data.total"), sent as revenue on the goal hit',
  ).optional(),
  customDimensions: CustomDimensionsSchema.describe(
    'Custom dimensions for this rule, keyed by bare dimension id. Values are mapping values resolved against the event (like { "1": "data.size" }). Wins per key over the destination customDimensions.',
  ).optional(),
});
