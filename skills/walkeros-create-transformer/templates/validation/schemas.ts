import { z } from 'zod';

export const SettingsSchema = z.object({
  fieldsToRedact: z.array(z.string()).default([]),
  logRedactions: z.boolean().default(false),
});
