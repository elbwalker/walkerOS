import type { Store } from '@walkeros/core';
import type { GcsStoreSettings, ServiceAccountCredentials } from './types';
import { createTokenProvider } from './auth';

const GCS_BASE = 'https://storage.googleapis.com';

function isValidKey(key: string): boolean {
  if (!key || key.startsWith('/') || key.startsWith('\\')) return false;
  return !key.split(/[/\\]/).includes('..');
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) return '';
  const trimmed = prefix.replace(/^\/+|\/+$/g, '');
  return trimmed ? trimmed + '/' : '';
}

function parseCredentials(
  credentials?: string | ServiceAccountCredentials,
): ServiceAccountCredentials | undefined {
  if (!credentials) return undefined;
  if (typeof credentials === 'string') return JSON.parse(credentials);
  return credentials;
}

export const storeGcsInit: Store.Init<Store.Types<GcsStoreSettings>> = (
  context,
) => {
  const settings = context.config.settings as GcsStoreSettings;
  const prefix = normalizePrefix(settings.prefix);
  const creds = parseCredentials(settings.credentials);
  const getToken = createTokenProvider(creds);
  const bucket = encodeURIComponent(settings.bucket);

  function resolveKey(key: string): string | undefined {
    if (!isValidKey(key)) {
      context.logger.warn('Invalid key rejected', { key });
      return undefined;
    }
    return prefix + key;
  }

  return {
    type: 'gcs',
    config: context.config as Store.Config<Store.Types<GcsStoreSettings>>,

    async get(key: string): Promise<Buffer | undefined> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return undefined;

      try {
        const token = await getToken();
        const url = `${GCS_BASE}/download/storage/v1/b/${bucket}/o/${encodeURIComponent(gcsKey)}?alt=media`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return undefined;
        return Buffer.from(await res.arrayBuffer());
      } catch {
        return undefined;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return;

      const token = await getToken();
      const url = `${GCS_BASE}/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(gcsKey)}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(value as Buffer),
      });
    },

    async delete(key: string): Promise<void> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return;

      try {
        const token = await getToken();
        const url = `${GCS_BASE}/storage/v1/b/${bucket}/o/${encodeURIComponent(gcsKey)}`;
        await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* GCS delete is idempotent */
      }
    },
  };
};
