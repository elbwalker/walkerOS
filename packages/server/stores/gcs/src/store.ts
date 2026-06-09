import type { Logger, Store } from '@walkeros/core';
import { serializeStoreValue, deserializeStoreValue } from '@walkeros/core';
import type {
  GcsStoreSettings,
  ServiceAccountCredentials,
  Types,
} from './types';
import { createTokenProvider } from './auth';
import { resolveCredentials } from './credentials';
import { setup as gcsSetup } from './setup';
import { resolveProjectId } from './setup-helpers';

const GCS_BASE = 'https://storage.googleapis.com';

const JSON_CONTENT_TYPE = 'application/json';
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

// Minimal extension to content-type map for the file-mode asset-serving use
// case (serving walker.js and friends back with a correct mime). Anything not
// listed falls back to application/octet-stream.
const MIME_BY_EXT: Readonly<Record<string, string>> = {
  js: 'application/javascript',
  mjs: 'application/javascript',
  json: 'application/json',
  css: 'text/css',
  html: 'text/html',
  txt: 'text/plain',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  wasm: 'application/wasm',
  map: 'application/json',
};

function mimeFromKey(key: string): string {
  const dot = key.lastIndexOf('.');
  if (dot < 0 || dot === key.length - 1) return DEFAULT_CONTENT_TYPE;
  const ext = key.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? DEFAULT_CONTENT_TYPE;
}

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

/**
 * Wrap bytes in a fresh Uint8Array backed by a plain ArrayBuffer so they
 * satisfy fetch's BodyInit contract. Avoids type casts: Node's Buffer
 * type is `Buffer<ArrayBufferLike>`, while the DOM's BodyInit (used by
 * fetch's RequestInit) expects `ArrayBufferView<ArrayBuffer>`. Accepts any
 * Uint8Array (Buffer included, plus the codec's plain Uint8Array output).
 */
function bufferToBody(buf: Uint8Array): Uint8Array<ArrayBuffer> {
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
function resolveProjectIdForMessage(
  credentials: Store.Credentials<Types> | undefined,
): string {
  try {
    return resolveProjectId({}, credentials);
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
  credentials: Store.Credentials<Types> | undefined,
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
      const projectId = resolveProjectIdForMessage(credentials);
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
  const rawCreds = resolveCredentials(context.config, context.logger);
  const creds = parseCredentials(rawCreds);
  const getToken = createTokenProvider(creds);
  const bucketRaw = settings.bucket;
  const bucket = encodeURIComponent(bucketRaw);
  const id = context.id;
  const { logger } = context;
  // One mode per instance, decided at init. file:true persists raw bytes
  // byte-exact with a real mime; structured mode round-trips StoreValue
  // through the shared core codec, stored as application/json.
  const fileMode = context.config.file === true;

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

    async get(key: string): Promise<Store.StoreValue | undefined> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return undefined;

      await ensureBucketExists(bucketRaw, id, rawCreds, getToken, logger);

      let bytes: Buffer;
      try {
        const token = await getToken();
        const url = `${GCS_BASE}/download/storage/v1/b/${bucket}/o/${encodeURIComponent(gcsKey)}?alt=media`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return undefined;
        bytes = Buffer.from(await res.arrayBuffer());
      } catch {
        return undefined;
      }
      // File mode hands the raw bytes back untouched (Buffer is a Uint8Array,
      // a valid StoreValue leaf). Structured mode decodes the utf8-JSON payload.
      // A corrupt or empty payload (GCS can return ok:true with an empty body)
      // degrades to a miss rather than throwing a raw SyntaxError.
      if (fileMode) return bytes;
      try {
        return deserializeStoreValue(bytes);
      } catch (err) {
        logger.debug('structured decode failed, degrading to miss', {
          key,
          error: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },

    async set(key: string, value: Store.StoreValue): Promise<void> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return;

      let body: Uint8Array<ArrayBuffer>;
      let contentType: string;
      if (fileMode) {
        // Byte-exact passthrough: accept Uint8Array (Buffer included) or string.
        if (typeof value === 'string') {
          body = bufferToBody(Buffer.from(value));
        } else if (value instanceof Uint8Array) {
          body = bufferToBody(value);
        } else {
          throw new Error(
            'storeGcsInit.set: in file mode value must be Uint8Array or string; got ' +
              typeof value,
          );
        }
        contentType = mimeFromKey(key);
      } else {
        // Structured mode: serialize to utf8-JSON bytes, uploaded as JSON.
        body = bufferToBody(serializeStoreValue(value));
        contentType = JSON_CONTENT_TYPE;
      }

      await ensureBucketExists(bucketRaw, id, rawCreds, getToken, logger);

      const token = await getToken();
      const url = `${GCS_BASE}/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(gcsKey)}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body,
      });
    },

    async delete(key: string): Promise<void> {
      const gcsKey = resolveKey(key);
      if (!gcsKey) return;

      await ensureBucketExists(bucketRaw, id, rawCreds, getToken, logger);

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
