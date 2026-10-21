import { S3mini } from 's3mini';
import {
  serializeStoreValue,
  deserializeStoreValue,
  StepError,
} from '@walkeros/core';
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
  // The settings S3 cannot work without, each a non-empty string.
  const required: Record<string, unknown> = {
    bucket: settings?.bucket,
    endpoint: settings?.endpoint,
    accessKeyId: settings?.accessKeyId,
    secretAccessKey: settings?.secretAccessKey,
  };
  const missing = Object.keys(required).filter((key) => {
    const value = required[key];
    return typeof value !== 'string' || value.length === 0;
  });
  if (missing.length)
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
}

/** A failed S3 call as a StepError; the client's own message stays the cause. */
function storeError(operation: string, err: unknown): StepError {
  if (err instanceof StepError) return err;
  return new StepError(`S3 ${operation} failed`, {
    code: 'transport',
    cause: err,
  });
}

export const storeS3Init: Store.Init<Types> = async (context) => {
  assertSettings(context.config.settings);
  const settings = context.config.settings;
  const prefix = normalizePrefix(settings.prefix);
  // One mode per instance, decided at init. file:true persists raw bytes
  // byte-exact with a real mime; structured mode round-trips StoreValue
  // through the shared core codec, stored as application/json.
  const fileMode = context.config.file === true;

  // An injected fetch (tests, simulate) carries every S3 request; s3mini
  // uses the global fetch when none is given.
  const injectedFetch = context.env?.fetch ?? context.config.env?.fetch;
  const client = new S3mini({
    endpoint: buildEndpoint(settings.endpoint, settings.bucket),
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    region: settings.region || 'auto',
    ...(injectedFetch ? { fetch: injectedFetch } : {}),
  });

  function resolveKey(key: string): string | undefined {
    if (!isValidKey(key)) {
      context.logger.warn('Invalid key rejected', { key });
      return undefined;
    }
    return prefix + key;
  }

  // The bucket is checked once, at the first operation, so init stays
  // offline. A missing bucket fails with an actionable message (S3 answers a
  // missing object and a missing bucket alike); a failed check is retried.
  let checked: Promise<void> | undefined;
  function ensureBucket(): Promise<void> {
    if (!checked) {
      const checking = client.bucketExists().then(
        (exists) => {
          if (exists) return;
          const setupId = context.id ?? 's3';
          throw new StepError(
            `S3 bucket not found: ${settings.bucket} at ${settings.endpoint}. ` +
              `Run "walkeros setup store.${setupId}" to create it.`,
            { code: 'config' },
          );
        },
        (err: unknown) => {
          throw storeError('bucket check', err);
        },
      );
      checking.catch(() => {
        if (checked === checking) checked = undefined;
      });
      checked = checking;
    }
    return checked;
  }

  return {
    type: 's3',
    config: {
      settings,
      env: context.config.env,
      id: context.config.id,
      logger: context.config.logger,
      // The declared byte mode; state and validation read it from here.
      file: context.config.file,
    },

    async get(key: string): Promise<Store.StoreValue | undefined> {
      const s3Key = resolveKey(key);
      if (!s3Key) return undefined;

      await ensureBucket();
      let arrayBuffer: ArrayBuffer | null;
      try {
        arrayBuffer = await client.getObjectArrayBuffer(s3Key);
      } catch (err) {
        throw storeError('read', err);
      }
      // A missing object is a miss; any other failed read threw above.
      if (!arrayBuffer) return undefined;
      const bytes = Buffer.from(arrayBuffer);
      // File mode hands the raw bytes back untouched (Buffer is a Uint8Array,
      // a valid StoreValue leaf). Structured mode decodes the utf8-JSON
      // payload; a stored value that does not decode (corrupt or empty) is a
      // failed read, never a miss. The message names no value.
      if (fileMode) return bytes;
      try {
        return deserializeStoreValue(bytes);
      } catch (err) {
        throw new StepError('S3 value could not be decoded', {
          code: 'decode',
          retryable: false,
          cause: err,
        });
      }
    },

    async set(key: string, value: Store.StoreValue): Promise<void> {
      const s3Key = resolveKey(key);
      if (!s3Key) return;

      // File mode: byte-exact passthrough of Uint8Array (Buffer included)
      // or string, with a real mime. Structured mode: utf8-JSON bytes.
      let body: Uint8Array | string;
      let contentType: string;
      if (!fileMode) {
        body = serializeStoreValue(value);
        contentType = JSON_CONTENT_TYPE;
      } else if (value instanceof Uint8Array || typeof value === 'string') {
        body = value;
        contentType = mimeFromKey(key);
      } else {
        throw new StepError(
          'storeS3Init.set: in file mode value must be Uint8Array or string; got ' +
            typeof value,
          { code: 'config' },
        );
      }

      await ensureBucket();
      try {
        await client.putObject(s3Key, body, contentType);
      } catch (err) {
        throw storeError('write', err);
      }
    },

    async delete(key: string): Promise<void> {
      const s3Key = resolveKey(key);
      if (!s3Key) return;

      // S3 answers a delete of a missing object with success; any other
      // failure is reported.
      await ensureBucket();
      try {
        await client.deleteObject(s3Key);
      } catch (err) {
        throw storeError('delete', err);
      }
    },
  };
};
