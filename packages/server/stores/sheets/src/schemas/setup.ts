import { z } from '@walkeros/core/dev';

export const SetupSchema = z
  .object({
    headers: z
      .array(z.string())
      .optional()
      .describe('Header values to write into row 1 of the configured sheet'),
  })
  .describe(
    'Provisioning options for "walkeros setup store.<id>". Idempotent: re-running with the same headers is a no-op overwrite, never alters existing data rows.',
  );

export type Setup = z.infer<typeof SetupSchema>;
