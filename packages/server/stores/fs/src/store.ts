import * as fs from 'fs/promises';
import * as path from 'path';
import type { Store } from '@walkeros/core';
import { StepError } from '@walkeros/core';
import {
  serializeStoreValue,
  deserializeStoreValue,
} from '@walkeros/core/node';
import type { FsStoreEnv, FsStoreFs, FsStoreSettings } from './types';

function isValidKey(key: string): boolean {
  if (!key || key.startsWith('/') || key.startsWith('\\')) return false;
  return !key.split(/[/\\]/).includes('..');
}

/** The error code of a failed file operation (`ENOENT`, `EACCES`). */
function errorCode(err: unknown): string | undefined {
  // Duck-typed: errors from node:fs may come from another realm.
  if (typeof err !== 'object' || err === null || !('code' in err)) return;
  return typeof err.code === 'string' ? err.code : undefined;
}

/**
 * No file is stored at the key: it does not exist, a directory on its path
 * is a file, or the key names a directory. A miss.
 */
function isMissing(err: unknown): boolean {
  const code = errorCode(err);
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR';
}

/** A failed file operation as a StepError, its message without the key. */
function storeError(operation: string, err: unknown): StepError {
  const code = errorCode(err);
  return new StepError(
    `fs store ${operation} failed${code ? ` (${code})` : ''}`,
    { code: 'transport', cause: err },
  );
}

type Types = Store.Types<FsStoreSettings, FsStoreEnv>;

export const storeFsInit: Store.Init<Types> = (context) => {
  const settings: Partial<FsStoreSettings> = context.config.settings || {};
  if (!settings.basePath)
    throw new StepError('Config settings basePath missing', {
      code: 'config',
    });
  const config: Store.Config<Types> = {
    ...context.config,
    settings: { basePath: settings.basePath },
  };
  const basePath = path.resolve(settings.basePath);
  // One mode per instance, decided at init. file:true persists raw bytes
  // byte-exact; the default structured mode round-trips StoreValue through the
  // shared core codec (utf8 JSON, binary leaves base64-tagged).
  const fileMode = context.config.file === true;
  // An injected fs (tests, simulate); the file system otherwise.
  const files: FsStoreFs = context.env.fs ?? fs;

  function resolvePath(key: string): string | undefined {
    if (!isValidKey(key)) {
      context.logger.warn('Path traversal rejected', { key });
      return undefined;
    }
    const resolved = path.join(basePath, key);
    if (!resolved.startsWith(basePath + path.sep) && resolved !== basePath)
      return undefined;
    return resolved;
  }

  return {
    type: 'fs',
    config,

    async get(key: string): Promise<Store.StoreValue | undefined> {
      const filePath = resolvePath(key);
      if (!filePath) return undefined;
      let bytes: Uint8Array;
      try {
        bytes = await files.readFile(filePath);
      } catch (err) {
        // A missing file is a miss; any other failed read is reported.
        if (isMissing(err)) return undefined;
        throw storeError('read', err);
      }
      // File mode hands the raw bytes back untouched (Buffer is a Uint8Array,
      // a valid StoreValue leaf). Structured mode decodes the utf8-JSON
      // payload; a stored value that does not decode (corrupt or empty) is a
      // failed read, never a miss. The message names no value.
      if (fileMode) return bytes;
      try {
        return deserializeStoreValue(bytes);
      } catch (err) {
        throw new StepError('fs store value could not be decoded', {
          code: 'decode',
          retryable: false,
          cause: err,
        });
      }
    },

    async set(key: string, value: Store.StoreValue): Promise<void> {
      const filePath = resolvePath(key);
      if (!filePath) return;

      // Byte-exact passthrough in file mode: Uint8Array (Buffer included) or
      // string. Structured mode: any StoreValue as a utf8-JSON byte payload.
      let bytes: Uint8Array | string;
      if (!fileMode) bytes = serializeStoreValue(value);
      else if (value instanceof Uint8Array || typeof value === 'string')
        bytes = value;
      else
        throw new StepError(
          `fs store in file mode persists Uint8Array or string values only, received ${typeof value}`,
          { code: 'config' },
        );

      try {
        await files.mkdir(path.dirname(filePath), { recursive: true });
        await files.writeFile(filePath, bytes);
      } catch (err) {
        throw storeError('write', err);
      }
    },

    async delete(key: string): Promise<void> {
      const filePath = resolvePath(key);
      if (!filePath) return;
      try {
        await files.unlink(filePath);
      } catch (err) {
        // Deleting a missing file is a no-op; any other failure is reported.
        if (!isMissing(err)) throw storeError('delete', err);
      }
    },
  };
};
