import { z } from '@walkeros/core/schemas';

export const MappingSchema = z.object({
  goalId: z.string().describe('ID to count the event as a goal (like 1)'),
  goalValue: z
    .string()
    .describe('Property to be used as the goal value (like data.value)')
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
