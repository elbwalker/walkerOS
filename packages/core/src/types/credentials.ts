/**
 * Shared credentials types for steps that authenticate against an external
 * service. A step's `Types['credentials']` points at one of these (or its own
 * shape); the value resolves via `$env` like any other config field.
 */

/**
 * Google-style service account credentials. The common shape for GCP-family
 * packages (Pub/Sub, Sheets, GCS, DataManager). `project_id` is optional
 * because some clients derive it from the runtime environment.
 */
export interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/**
 * A credential value: either a JSON string (often a `$env` reference) or the
 * already-parsed object form `T`.
 */
export type Credential<T> = string | T;
