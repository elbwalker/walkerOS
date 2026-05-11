import { z } from '@walkeros/core/dev';

export const SetupSchema = z
  .object({
    region: z
      .string()
      .default('eu-central-1')
      .describe(
        'Region the bucket is created in. Defaults to settings.region when concrete (not "auto"), otherwise eu-central-1.',
      ),
  })
  .describe(
    'Provisioning options for "walkeros setup store.<id>". Idempotent: only the bucket is created. Encryption, public-access block, versioning, lifecycle rules, and tags are not applied here (s3mini does not expose those operations); configure them once via the AWS Console or "aws s3api".',
  );

export type Setup = z.infer<typeof SetupSchema>;
