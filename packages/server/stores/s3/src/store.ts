import { S3mini } from 's3mini';
import type { Store } from '@walkeros/core';
import type { S3StoreSettings, Types } from './types';

function isValidKey(key: string): boolean {
  if (!key || key.startsWith('/') || key.startsWith('\\')) return false;
  return !key.split(/[/\\]/).includes('..');
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) return '';
  const trimmed = prefix.replace(/^\/+|\/+$/g, '');
  return trimmed ? trimmed + '/' : '';
}

function buildEndpoint(endpoint: string, bucket: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return `${base}/${bucket}`;
}

function assertSettings(
  settings: Partial<S3StoreSettings> | undefined,
): asserts settings is S3StoreSettings {
  if (
    !settings ||
    typeof settings.bucket !== 'string' ||
    settings.bucket.length === 0
  ) {
    throw new Error(
      'storeS3Init: settings.bucket is required (non-empty string)',
    );
  }
  if (typeof settings.endpoint !== 'string' || settings.endpoint.length === 0) {
    throw new Error(
      'storeS3Init: settings.endpoint is required (non-empty string)',
    );
  }
  if (
    typeof settings.accessKeyId !== 'string' ||
    settings.accessKeyId.length === 0
  ) {
    throw new Error(
      'storeS3Init: settings.accessKeyId is required (non-empty string)',
    );
  }
  if (
    typeof settings.secretAccessKey !== 'string' ||
    settings.secretAccessKey.length === 0
  ) {
    throw new Error(
      'storeS3Init: settings.secretAccessKey is required (non-empty string)',
    );
  }
}

export const storeS3Init: Store.Init<Types> = async (context) => {
  assertSettings(context.config.settings);
  const settings = context.config.settings;
  const prefix = normalizePrefix(settings.prefix);

  const client = new S3mini({
    endpoint: buildEndpoint(settings.endpoint, settings.bucket),
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    region: settings.region || 'auto',
  });

  function resolveKey(key: string): string | undefined {
    if (!isValidKey(key)) {
      context.logger.warn('Invalid key rejected', { key });
      return undefined;
    }
    return prefix + key;
  }

  // Hard-fail with an actionable message if the bucket is missing.
  // Mirrors the BigQuery init-time hard-fail pattern.
  const exists = await client.bucketExists();
  if (!exists) {
    const setupId = context.id ?? 's3';
    const errorMsg =
      `S3 bucket not found: ${settings.bucket} at ${settings.endpoint}. ` +
      `Run "walkeros setup store.${setupId}" to create it.`;
    context.logger.error(errorMsg, {
      bucket: settings.bucket,
      endpoint: settings.endpoint,
    });
    throw new Error(errorMsg);
  }

  return {
    type: 's3',
    config: {
      settings,
      env: context.config.env,
      id: context.config.id,
      logger: context.config.logger,
    },

    async get(key: string): Promise<Buffer | undefined> {
      const s3Key = resolveKey(key);
      if (!s3Key) return undefined;

      try {
        const arrayBuffer = await client.getObjectArrayBuffer(s3Key);
        if (!arrayBuffer) return undefined;
        return Buffer.from(arrayBuffer);
      } catch {
        return undefined;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      const s3Key = resolveKey(key);
      if (!s3Key) return;

      if (!Buffer.isBuffer(value)) {
        throw new Error(
          'storeS3Init.set: value must be a Buffer; got ' + typeof value,
        );
      }
      await client.putObject(s3Key, value);
    },

    async delete(key: string): Promise<void> {
      const s3Key = resolveKey(key);
      if (!s3Key) return;

      try {
        await client.deleteObject(s3Key);
      } catch {
        /* S3 delete is idempotent */
      }
    },
  };
};
