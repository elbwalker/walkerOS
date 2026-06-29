import { z, toJsonSchema } from './validation';

/**
 * Credentials Schemas
 *
 * Mirrors: types/credentials.ts
 *
 * Reusable strict credentials schema for packages that authenticate with a
 * Google-style service account. Packages import `CredentialsSchema` to validate
 * their `config.credentials` field. This is intentionally kept SEPARATE from the
 * loose placeholder field on the core Config schemas, which must not reject
 * non-GCP credential shapes (AWS, Kafka, future) at the core layer.
 */

/**
 * ServiceAccount - Google-style service account object.
 */
export const ServiceAccountSchema = z
  .object({
    client_email: z.string().describe('Service account client email'),
    private_key: z.string().describe('Service account private key (PEM)'),
    project_id: z
      .string()
      .optional()
      .describe('GCP project id (derived from environment when omitted)'),
  })
  .meta({
    id: 'ServiceAccount',
    title: 'ServiceAccount',
    description:
      'Google-style service account credentials (client_email, private_key, optional project_id).',
  })
  .describe('Google-style service account credentials');

/**
 * Credentials - either a JSON string (often a `$secret.NAME` reference to a
 * managed secret) or a parsed service account object.
 */
export const CredentialsSchema = z
  .union([z.string(), ServiceAccountSchema])
  .meta({
    id: 'Credentials',
    title: 'Credentials',
    description:
      'Service account credentials: a JSON string (back it with a managed secret via $secret.NAME) or a parsed service account object.',
  })
  .describe(
    'Service account credentials: a JSON string (back it with a managed secret via $secret.NAME) or a parsed object',
  );

export const credentialsJsonSchema = toJsonSchema(
  CredentialsSchema,
  'Credentials',
);
