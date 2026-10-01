import { z } from '@walkeros/core/dev';

const streamName = z
  .string()
  .min(1)
  .describe('Name of the Firehose stream (like walkeros-events). Required.')
  .optional();

const region = z
  .string()
  .describe(
    'AWS region of the stream (like eu-central-1). Default: AWS_REGION or the active profile, else eu-central-1.',
  );

const client = z
  .any()
  .describe(
    'A FirehoseClient of your own. Used as is and never closed by the destination.',
  );

const config = z
  .any()
  .describe(
    'Raw FirehoseClient options passed to the SDK (like { endpoint, maxAttempts }). Put keys in config.credentials instead.',
  );

/** @deprecated The nested form, still read as an alias of the flat fields. */
export const FirehoseConfigSchema = z.object({
  streamName,
  client: client.optional(),
  region: region.optional(),
  config: config.optional(),
});

export const SettingsSchema = z.object({
  // Optional in the schema only so the deprecated alias still validates;
  // init throws when neither form names a stream.
  streamName,
  region: region.optional(),
  newline: z
    .boolean()
    .describe(
      'Append a newline to every record (default true). Set false when the stream adds its own new line delimiter.',
    )
    .optional(),
  config: config.optional(),
  client: client.optional(),
  firehose: FirehoseConfigSchema.describe(
    'Deprecated: use the flat fields streamName, region, config and client.',
  ).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
