import { z } from 'zod';

export const ApiOutputShape = {
  action: z.string().describe('Action that was executed'),
  ok: z.boolean().describe('Whether the action succeeded'),
  data: z.unknown().describe('Action-specific result data'),
};
