import { S3mini } from 's3mini';
import { serializeStoreValue, deserializeStoreValue } from '@walkeros/core';
import type { Store } from '@walkeros/core';
import type { S3StoreSettings, Types } from './types';

function isValidKey(key: string): boolean {
  if (!key || key.startsWith('/') || key.startsWith('\\')) return false;
  return !key.split(/[/\\]/).includes('..');
}

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
  // One mode per instance, decided at init. file:true persists raw bytes
  // byte-exact with a real mime; structured mode round-trips StoreValue
  // through the shared core codec, stored as application/json.
  const fileMode = context.config.file === true;

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

    async get(key: string): Promise<Store.StoreValue | undefined> {
      const s3Key = resolveKey(key);
      if (!s3Key) return undefined;

      let bytes: Buffer;
      try {
        const arrayBuffer = await client.getObjectArrayBuffer(s3Key);
        if (!arrayBuffer) return undefined;
        bytes = Buffer.from(arrayBuffer);
      } catch {
        return undefined;
      }
      // File mode hands the raw bytes back untouched (Buffer is a Uint8Array,
      // a valid StoreValue leaf). Structured mode decodes the utf8-JSON payload.
      // A corrupt or empty payload (e.g. a 0-byte object) degrades to a miss
      // rather than throwing a raw SyntaxError.
      if (fileMode) return bytes;
      try {
        return deserializeStoreValue(bytes);
      } catch (err) {
        context.logger.debug('structured decode failed, degrading to miss', {
          key,
          error: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },

    async set(key: string, value: Store.StoreValue): Promise<void> {
      const s3Key = resolveKey(key);
      if (!s3Key) return;

      if (fileMode) {
        // Byte-exact passthrough: accept Uint8Array (Buffer included) or string.
        if (!(value instanceof Uint8Array) && typeof value !== 'string') {
          throw new Error(
            'storeS3Init.set: in file mode value must be Uint8Array or string; got ' +
              typeof value,
          );
        }
        await client.putObject(s3Key, value, mimeFromKey(key));
        return;
      }

      // Structured mode: serialize to utf8-JSON bytes, stored as JSON.
      await client.putObject(
        s3Key,
        serializeStoreValue(value),
        JSON_CONTENT_TYPE,
      );
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
