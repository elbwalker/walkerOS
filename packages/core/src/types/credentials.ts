/**
 * Shared credentials types for steps that authenticate against an external
 * service. A step's `Types['credentials']` points at one of these (or its own
 * shape). The value resolves like any other config field; back it with a
 * managed secret via `$secret.NAME` (credentials, tokens, and private keys
 * must use `$secret`, not `$env`, so the deploy pipeline injects them).
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
 * A credential value: either a JSON string (often a `$secret.NAME` reference to
 * a managed secret) or the already-parsed object form `T`.
 */
export type Credential<T> = string | T;
