import type { GcsStoreSettings, ServiceAccountCredentials } from './types';

/**
 * Resolves the GCP project ID used to create a bucket in the GCS JSON API.
 *
 * Resolution order:
 *   1. `setup.projectId` (explicit override).
 *   2. `settings.credentials.project_id` (when SA JSON is parsed and contains it).
 *   3. `process.env.GOOGLE_CLOUD_PROJECT` (Cloud Run / GKE convention).
 *   4. Throw with an actionable error message.
 *
 * `process.env.GOOGLE_CLOUD_PROJECT` is read at call time, not at module load,
 * so changes after import are honored.
 */
export function resolveProjectId(
  settings: GcsStoreSettings,
  setup: { projectId?: string },
): string {
  if (setup.projectId) return setup.projectId;

  const fromCreds = extractProjectIdFromCredentials(settings.credentials);
  if (fromCreds) return fromCreds;

  const fromEnv = process.env.GOOGLE_CLOUD_PROJECT;
  if (fromEnv) return fromEnv;

  throw new Error(
    'setup: projectId is required. Set setup.projectId, provide a service account with project_id, or export GOOGLE_CLOUD_PROJECT.',
  );
}

/**
 * Typed predicate: returns the `project_id` field from credentials when
 * present and a string. Avoids type casts by validating the runtime shape.
 *
 * - `string` credentials are parsed as JSON; non-JSON or non-object payloads
 *    return undefined.
 * - object credentials are inspected directly. Real SA JSON contains
 *   `project_id` even though `ServiceAccountCredentials` declares only the
 *    fields the runtime needs (client_email, private_key).
 */
function extractProjectIdFromCredentials(
  credentials: GcsStoreSettings['credentials'],
): string | undefined {
  if (!credentials) return undefined;

  if (typeof credentials === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(credentials);
    } catch {
      return undefined;
    }
    return readStringField(parsed, 'project_id');
  }

  return readStringField(credentials, 'project_id');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringField(
  value: ServiceAccountCredentials | unknown,
  field: string,
): string | undefined {
  if (!isRecord(value)) return undefined;
  const fieldValue = value[field];
  return typeof fieldValue === 'string' ? fieldValue : undefined;
}
