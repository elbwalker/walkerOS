import * as fs from 'fs/promises';
import * as path from 'path';
import type { Store } from '@walkeros/core';
import { serializeStoreValue, deserializeStoreValue } from '@walkeros/core';
import type { FsStoreSettings } from './types';

function isValidKey(key: string): boolean {
  if (!key || key.startsWith('/') || key.startsWith('\\')) return false;
  return !key.split(/[/\\]/).includes('..');
}

export const storeFsInit: Store.Init<Store.Types<FsStoreSettings>> = (
  context,
) => {
  const settings = context.config.settings as FsStoreSettings;
  const basePath = path.resolve(settings.basePath);
  // One mode per instance, decided at init. file:true persists raw bytes
  // byte-exact; the default structured mode round-trips StoreValue through the
  // shared core codec (utf8 JSON, binary leaves base64-tagged).
  const fileMode = context.config.file === true;

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
    config: context.config as Store.Config<Store.Types<FsStoreSettings>>,

    async get(key: string): Promise<Store.StoreValue | undefined> {
      const filePath = resolvePath(key);
      if (!filePath) return undefined;
      let bytes: Buffer;
      try {
        bytes = await fs.readFile(filePath);
      } catch {
        return undefined;
      }
      // File mode hands the raw bytes back untouched (Buffer is a Uint8Array,
      // a valid StoreValue leaf). Structured mode decodes the utf8-JSON payload
      // to a StoreValue (binary leaves become Uint8Array). A corrupt or empty
      // payload degrades to a miss rather than throwing a raw SyntaxError.
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
      const filePath = resolvePath(key);
      if (!filePath) return;
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      if (fileMode) {
        // Byte-exact passthrough: accept Uint8Array (Buffer included) or string.
        if (!(value instanceof Uint8Array) && typeof value !== 'string') {
          throw new Error(
            `fs store in file mode persists Uint8Array or string values only, received ${typeof value}`,
          );
        }
        await fs.writeFile(filePath, value);
        return;
      }

      // Structured mode: any StoreValue serializes to a utf8-JSON byte payload.
      await fs.writeFile(filePath, serializeStoreValue(value));
    },

    async delete(key: string): Promise<void> {
      const filePath = resolvePath(key);
      if (!filePath) return;
      try {
        await fs.unlink(filePath);
      } catch {
        /* ignore */
      }
    },
  };
};
