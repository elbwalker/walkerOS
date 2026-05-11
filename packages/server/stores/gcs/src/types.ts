import type { Store } from '@walkeros/core';

export interface GcsStoreSettings {
  /** GCS bucket name */
  bucket: string;

  /**
   * Key prefix prepended to all store keys.
   * No leading/trailing slash needed, normalized automatically.
   *
   * @example "public/assets" -> get("walker.js") looks up "public/assets/walker.js"
   */
  prefix?: string;

  /**
   * Service account credentials for non-GCP environments.
   * Pass a JSON string (e.g., from $env.GCS_SA_KEY) or the parsed object.
   * When omitted, uses Application Default Credentials (ADC) via the metadata server.
   */
  credentials?: string | ServiceAccountCredentials;
}

export interface ServiceAccountCredentials {
  /** Service account email (from SA JSON `client_email` field) */
  client_email: string;

  /** RSA private key in PEM format (from SA JSON `private_key` field) */
  private_key: string;
}

/**
 * Provisioning options for `walkeros setup store.<id>`.
 * Triggered only by the explicit CLI command. Idempotent. Never alters existing resources.
 *
 * `bucket` lives in `Settings`, NOT here (no duplication).
 * `projectId` lives here because the package's Settings does not currently carry one.
 */
export interface Setup {
  /** GCS project to create the bucket in. Resolution order: this, settings.credentials.project_id, GOOGLE_CLOUD_PROJECT env, then throw. */
  projectId?: string;
  /** Geographic location. Default: 'EU' (multi-region). */
  location?: string;
  /** Storage class. Default: 'STANDARD'. */
  storageClass?: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  /** Enable bucket versioning at create time. Default: false. */
  versioning?: boolean;
  /** Lifecycle rules to apply at create. Optional. Drift detection NOT included for lifecycle (complex object). */
  lifecycle?: { rule: unknown[] };
  /** CMEK key for at-rest encryption. Optional. */
  kmsKeyName?: string;
  /** Labels for cost allocation. Optional. */
  labels?: Record<string, string>;
}

export type Types = Store.Types<
  GcsStoreSettings,
  Store.BaseEnv,
  GcsStoreSettings,
  Setup
>;
