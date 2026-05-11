import type { Logger, Store } from '@walkeros/core';
import type {
  GcsStoreSettings,
  ServiceAccountCredentials,
  Types,
} from './types';
import { createTokenProvider } from './auth';
import { setup as gcsSetup } from './setup';
import { resolveProjectId } from './setup-helpers';

const GCS_BASE = 'https://storage.googleapis.com';

/**
 * Module-level cache for the bucket existence pre-check. Keyed by bucket
 * name (bucket names are globally unique in GCS). One HEAD per process per
 * bucket. The cache stores a Promise so concurrent first-operations share a
 * single in-flight request.
 *
 * Exported helpers below allow tests to reset/seed the cache.
 */
const bucketExistsCache: Map<string, Promise<boolean>> = new Map();

/** @internal Test-only: clear the existence cache. */
export function __resetBucketExistenceCache(): void {
  bucketExistsCache.clear();
}

/** @internal Test-only: seed the existence cache for a bucket. */
export function __seedBucketExists(bucket: string): void {
  bucketExistsCache.set(bucket, Promise.resolve(true));
}

function isValidKey(key: string): boolean {
  if (!key || key.startsWith('/') || key.startsWith('\\')) return false;
  return !key.split(/[/\\]/).includes('..');
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) return '';
  const trimmed = prefix.replace(/^\/+|\/+$/g, '');
  return trimmed ? trimmed + '/' : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isServiceAccountShape(
  value: unknown,
): value is ServiceAccountCredentials {
  if (!isRecord(value)) return false;
  return (
    typeof value.client_email === 'string' &&
    typeof value.private_key === 'string'
  );
}

function parseCredentials(
  credentials?: string | ServiceAccountCredentials,
): ServiceAccountCredentials | undefined {
  if (!credentials) return undefined;
  if (typeof credentials === 'string') {
    const parsed: unknown = JSON.parse(credentials);
    if (isServiceAccountShape(parsed)) return parsed;
    return undefined;
  }
  return credentials;
}

function isBufferLike(value: unknown): value is Buffer {
  return Buffer.isBuffer(value);
}

/**
 * Wrap a Buffer in a fresh Uint8Array backed by a plain ArrayBuffer so it
 * satisfies fetch's BodyInit contract. Avoids type casts: Node's Buffer
 * type is `Buffer<ArrayBufferLike>`, while the DOM's BodyInit (used by
 * fetch's RequestInit) expects `ArrayBufferView<ArrayBuffer>`.
 */
function bufferToBody(buf: Buffer): Uint8Array<ArrayBuffer> {
  const out = new ArrayBuffer(buf.byteLength);
  const view = new Uint8Array(out);
  view.set(buf);
  return view;
}

function assertGcsSettings(
  settings: Partial<GcsStoreSettings> | undefined,
): asserts settings is GcsStoreSettings {
  if (
    !settings ||
    typeof settings.bucket !== 'string' ||
    settings.bucket.length === 0
  ) {
    throw new Error(
      'storeGcsInit: settings.bucket is required (non-empty string)',
    );
  }
}

/**
 * Resolve a project ID for the runtime hard-fail message. Uses the same
 * resolution order as setup but never throws: returns "unknown" when no
 * source is available so the error message is still actionable.
 */
function resolveProjectIdForMessage(settings: GcsStoreSettings): string {
  try {
    return resolveProjectId(settings, {});
  } catch {
    return 'unknown';
  }
}

/**
 * Verify the bucket exists. Issues `HEAD /storage/v1/b/<bucket>` once per
 * process per bucket. On 404, throws an actionable error pointing at the
 * setup command. On any other failure (non-2xx response or transport
 * error), treats the result as "exists" to avoid blocking legitimate
 * operations on a transient blip.
 */
async function ensureBucketExists(
  bucket: string,
  id: string,
  settings: GcsStoreSettings,
  getToken: () => Promise<string>,
  logger: Logger.Instance,
): Promise<void> {
  const existing = bucketExistsCache.get(bucket);
  if (existing !== undefined) {
    await existing;
    return;
  }

  const promise = (async (): Promise<boolean> => {
    let res: Response;
    try {
      const token = await getToken();
      const url = `${GCS_BASE}/storage/v1/b/${encodeURIComponent(bucket)}`;
      res = await fetch(url, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      logger.debug('ensureBucketExists check failed (non-fatal)', {
        bucket,
        error: err instanceof Error ? err.message : String(err),
      });
      return true;
    }

    if (res.status === 404) {
      const projectId = resolveProjectIdForMessage(settings);
      throw new Error(
        `GCS bucket not found: ${bucket} in project ${projectId}. Run "walkeros setup store.${id}" to create it.`,
      );
    }
    if (!res.ok) {
      logger.debug('ensureBucketExists check failed (non-fatal)', {
        bucket,
        status: res.status,
      });
    }
    return true;
  })();

  bucketExistsCache.set(bucket, promise);
  try {
    await promise;
  } catch (err) {
    // Drop the failing entry so the next call retries the check.
    bucketExistsCache.delete(bucket);
    throw err;
  }
}

export const storeGcsInit: Store.Init<Types> = (context) => {
  assertGcsSettings(context.config.settings);
  const settings: GcsStoreSettings = context.config.settings;
  const prefix = normalizePrefix(settings.prefix);
  const creds = parseCredentials(settings.credentials);
  const getToken = createTokenProvider(creds);
  const bucketRaw = settings.bucket;
  const bucket = encodeURIComponent(bucketRaw);
  const id = context.id;
  const { logger } = context;

  function resolveKey(key: string): string | undefined {
    if (!isValidKey(key)) {
      logger.warn('Invalid key rejected', { key });
      return undefined;
    }
    return prefix + key;
  }

  const config: Store.Config<Types> = {
    settings,
    env: context.config.env,
    id: context.config.id,
    logger: context.config.logger,
    // `setup` from the incoming context.config is typed as `unknown` because
    // the Init context narrows only the settings/env/initSettings slots and
    // not the setup-options slot. The flow runtime never uses this field at
    // runtime (setup is invoked separately by the CLI), so omit it from the
    // returned config without a cast.
  };

  return {
    type: 'gcs',
    config,
    setup: gcsSetup,

    async get(key: string): Promise<Buffer | undefined> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return undefined;

      await ensureBucketExists(bucketRaw, id, settings, getToken, logger);

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

      if (!isBufferLike(value)) {
        throw new Error(
          'storeGcsInit.set: value must be a Buffer; got ' + typeof value,
        );
      }

      await ensureBucketExists(bucketRaw, id, settings, getToken, logger);

      const token = await getToken();
      const url = `${GCS_BASE}/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(gcsKey)}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: bufferToBody(value),
      });
    },

    async delete(key: string): Promise<void> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return;

      await ensureBucketExists(bucketRaw, id, settings, getToken, logger);

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
