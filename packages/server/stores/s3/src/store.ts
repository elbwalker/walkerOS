import { S3mini } from 's3mini';
import type { Store } from '@walkeros/core';
import type { S3StoreSettings } from './types';

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

export const storeS3Init: Store.Init<Store.Types<S3StoreSettings>> = (
  context,
) => {
  const settings = context.config.settings as S3StoreSettings;
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

  return {
    type: 's3',
    config: context.config as Store.Config<Store.Types<S3StoreSettings>>,

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

      await client.putObject(s3Key, value as Buffer);
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
