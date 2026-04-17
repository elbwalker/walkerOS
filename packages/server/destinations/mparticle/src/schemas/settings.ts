import { z } from '@walkeros/core/dev';
import { EnvironmentSchema, PodSchema } from './primitives';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'mParticle input feed API key from the mParticle dashboard (Setup > Inputs > Feeds).',
    ),
  apiSecret: z
    .string()
    .min(1)
    .describe(
      'mParticle input feed API secret paired with apiKey. Used for HTTP Basic auth.',
    ),
  pod: PodSchema.describe(
    "mParticle data pod selecting the regional endpoint. Default: 'us1'.",
  ).optional(),
  environment: EnvironmentSchema.describe(
    "Environment the batch targets. Default: 'production'.",
  ).optional(),
  userIdentities: z
    .record(z.string(), z.unknown())
    .describe(
      'Mapping that resolves to user_identities per batch. Keys are mParticle identity types (like customer_id, email); values are walkerOS mapping values.',
    )
    .optional(),
  userAttributes: z
    .unknown()
    .describe(
      'Mapping value that resolves to the user_attributes object placed on the batch.',
    )
    .optional(),
  consent: z
    .record(z.string(), z.unknown())
    .describe(
      'Static consent_state envelope forwarded verbatim on the batch. See mParticle consent_state docs.',
    )
    .optional(),
  ip: z
    .unknown()
    .describe('Mapping value resolving to the client IP for the batch.')
    .optional(),
  sourceRequestId: z
    .unknown()
    .describe(
      'Mapping value resolving to the source_request_id for the batch. Falls back to event.id when unset.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
