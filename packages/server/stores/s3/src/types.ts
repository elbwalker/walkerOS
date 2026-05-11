import type { Store as CoreStore } from '@walkeros/core';

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
   * AWS region used for SigV4 signing at runtime. Most non-AWS providers
   * ignore this but SigV4 requires a region string. Use a concrete region
   * (e.g. `eu-central-1`) or `auto`.
   * @default "auto"
   */
  region?: string;

  /**
   * Key prefix prepended to all store keys.
   * Use to scope the store to a subdirectory within the bucket.
   * No leading/trailing slash needed, normalized automatically.
   *
   * @example "public/assets" then get("walker.js") looks up "public/assets/walker.js"
   */
  prefix?: string;
}

export type S3StoreInitSettings = S3StoreSettings;

/**
 * Provisioning options for `walkeros setup store.<id>`. Triggered only by the
 * explicit CLI command. Idempotent, never auto-run.
 *
 * The bucket name lives in `Settings.bucket` (not duplicated here) so a single
 * source of truth governs both setup and runtime get/set/delete.
 *
 * Variant B (minimal): only the create-time region is configurable. Encryption,
 * public-access block, versioning, lifecycle, and tags are not applied by setup
 * because `s3mini` does not expose them. Configure them via the AWS Console
 * or `aws s3api` once for now.
 */
export interface S3StoreSetup {
  /**
   * Region the bucket is created in. Used as the SigV4 region during
   * `createBucket` and (for AWS) as the `LocationConstraint`.
   *
   * Defaults to `settings.region` when settings.region is concrete (not `auto`),
   * otherwise `eu-central-1`. Per AGENT.md, EU is the default region for
   * elbwalker workloads.
   */
  region?: string;
}

export type Types = CoreStore.Types<
  S3StoreSettings,
  CoreStore.BaseEnv,
  S3StoreInitSettings,
  S3StoreSetup
>;
