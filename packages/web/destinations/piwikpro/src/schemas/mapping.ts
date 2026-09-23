import { schemas, z } from '@walkeros/core/dev';
import { CustomDimensionsSchema } from './settings';

export const MappingSchema = z.object({
  goalId: z
    .union([z.string(), z.number()])
    .describe(
      'Piwik PRO goal id (UUID or legacy integer). Adds a second hit, trackGoal.',
    )
    .optional(),
  goalValue: schemas.ValueSchema.describe(
    'Goal revenue, resolved from the event (like "data.total"), passed as the trackGoal conversion value',
  ).optional(),
  customDimensions: CustomDimensionsSchema.describe(
    'Custom dimensions for this rule, keyed by bare dimension id (like { "1": "data.size" }). Wins per key over the destination customDimensions.',
  ).optional(),
});
