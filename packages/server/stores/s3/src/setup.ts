import { S3mini } from 's3mini';
import type { LifecycleContext, SetupFn, Store } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type { S3StoreSettings, S3StoreSetup, Types } from './types';

/**
 * Default setup options. EU region by default per AGENT.md.
 */
export const DEFAULT_SETUP: Required<S3StoreSetup> = {
  region: 'eu-central-1',
};

export interface SetupResult {
  bucketCreated: boolean;
}

/**
 * Public alias kept for callers that imported the prior shape.
 * Equivalent to the framework's `Store.Config<Types>`.
 */
export type S3StoreConfig = Store.Config<Types>;

/**
 * Provision the S3 bucket described in the flow config. Idempotent. Triggered
 * only by the explicit `walkeros setup store.<id>` CLI command.
 *
 * Variant B: only the bucket is created. Encryption, public-access block,
 * versioning, lifecycle rules, and tags are not applied here because `s3mini`
 * does not expose the relevant API operations. Configure those once via the
 * AWS Console or `aws s3api`.
 */
export const setup: SetupFn<S3StoreConfig, Store.BaseEnv> = async (
  context: LifecycleContext<S3StoreConfig, Store.BaseEnv>,
) => {
  const { config, logger } = context;

  const options = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!options) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }

  assertS3Settings(config.settings);
  const settings = config.settings;

  // Region resolution per Open Question #4 (iii):
  // - explicit setup.region wins
  // - else fall back to settings.region when concrete (not 'auto')
  // - else default eu-central-1
  const explicitSetupRegion = readExplicitRegion(config.setup);
  const region = resolveRegion(explicitSetupRegion, settings.region);
  void options; // resolveSetup applies defaults; explicit branch handled separately

  const client = new S3mini({
    endpoint: buildEndpoint(settings.endpoint, settings.bucket),
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    region,
  });

  const exists = await client.bucketExists();
  if (exists) {
    logger.debug('setup: bucket exists', { bucket: settings.bucket });
    return { bucketCreated: false };
  }

  try {
    await client.createBucket();
    logger.info('setup: bucket created', {
      bucket: settings.bucket,
      region,
    });
    return { bucketCreated: true };
  } catch (err: unknown) {
    if (isAlreadyOwnedByYou(err)) {
      logger.debug('setup: bucket created concurrently (race)', {
        bucket: settings.bucket,
      });
      return { bucketCreated: false };
    }
    if (isAlreadyExistsDifferentOwner(err)) {
      throw new Error(
        `S3 bucket name "${settings.bucket}" is already in use by another AWS account. ` +
          `Choose a different bucket name in settings.bucket.`,
      );
    }
    throw err;
  }
};

function resolveRegion(
  explicitSetupRegion: string | undefined,
  settingsRegion: string | undefined,
): string {
  if (
    typeof explicitSetupRegion === 'string' &&
    explicitSetupRegion.length > 0
  ) {
    return explicitSetupRegion;
  }
  if (
    typeof settingsRegion === 'string' &&
    settingsRegion.length > 0 &&
    settingsRegion !== 'auto'
  ) {
    return settingsRegion;
  }
  return DEFAULT_SETUP.region;
}

function readExplicitRegion(raw: S3StoreConfig['setup']): string | undefined {
  if (!isRecord(raw)) return undefined;
  const value = raw.region;
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertS3Settings(
  settings: Partial<S3StoreSettings> | undefined,
): asserts settings is S3StoreSettings {
  if (
    !settings ||
    typeof settings.bucket !== 'string' ||
    settings.bucket.length === 0
  ) {
    throw new Error('setup: settings.bucket is required (non-empty string)');
  }
  if (typeof settings.endpoint !== 'string' || settings.endpoint.length === 0) {
    throw new Error('setup: settings.endpoint is required (non-empty string)');
  }
  if (
    typeof settings.accessKeyId !== 'string' ||
    settings.accessKeyId.length === 0
  ) {
    throw new Error(
      'setup: settings.accessKeyId is required (non-empty string)',
    );
  }
  if (
    typeof settings.secretAccessKey !== 'string' ||
    settings.secretAccessKey.length === 0
  ) {
    throw new Error(
      'setup: settings.secretAccessKey is required (non-empty string)',
    );
  }
}

function buildEndpoint(endpoint: string, bucket: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return `${base}/${bucket}`;
}

function isAlreadyOwnedByYou(err: unknown): boolean {
  return hasErrorCode(err, 'BucketAlreadyOwnedByYou');
}

function isAlreadyExistsDifferentOwner(err: unknown): boolean {
  return hasErrorCode(err, 'BucketAlreadyExists');
}

function hasErrorCode(err: unknown, code: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const obj: {
    code?: unknown;
    Code?: unknown;
    name?: unknown;
    serviceCode?: unknown;
  } = err;
  return (
    obj.code === code ||
    obj.Code === code ||
    obj.name === code ||
    obj.serviceCode === code
  );
}
