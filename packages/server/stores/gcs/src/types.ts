export interface GcsStoreSettings {
  /** GCS bucket name */
  bucket: string;

  /**
   * Key prefix prepended to all store keys.
   * No leading/trailing slash needed — normalized automatically.
   *
   * @example "public/assets" → get("walker.js") looks up "public/assets/walker.js"
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
