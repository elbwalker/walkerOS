export interface S3StoreSettings {
  /** S3 bucket name */
  bucket: string;

  /**
   * S3-compatible endpoint URL (required).
   *
   * Examples:
   * - AWS S3: "https://s3.us-east-1.amazonaws.com"
   * - Cloudflare R2: "https://<accountId>.r2.cloudflarestorage.com"
   * - Scaleway: "https://s3.fr-par.scw.cloud"
   * - DigitalOcean: "https://nyc3.digitaloceanspaces.com"
   * - MinIO: "http://localhost:9000"
   */
  endpoint: string;

  /** S3 access key ID */
  accessKeyId: string;

  /** S3 secret access key */
  secretAccessKey: string;

  /**
   * AWS region. Most non-AWS providers ignore this but SigV4 signing requires it.
   * @default "auto"
   */
  region?: string;

  /**
   * Key prefix prepended to all store keys.
   * Use to scope the store to a subdirectory within the bucket.
   * No leading/trailing slash needed — normalized automatically.
   *
   * @example "public/assets" → get("walker.js") looks up "public/assets/walker.js"
   */
  prefix?: string;
}
