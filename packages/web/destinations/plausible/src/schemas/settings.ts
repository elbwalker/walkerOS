import { z } from '@walkeros/core/schemas';

const hostnameRegex =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))*$/;

export const SettingsSchema = z.object({
  domain: z
    .string()
    .regex(hostnameRegex, 'Must be a valid hostname')
    .describe(
      'The domain of your site as registered in Plausible (like walkeros.io)',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
