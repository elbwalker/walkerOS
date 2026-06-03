import * as fs from 'fs/promises';
import * as path from 'path';
import type { Store } from '@walkeros/core';
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

    async get(key: string): Promise<unknown> {
      const filePath = resolvePath(key);
      if (!filePath) return undefined;
      try {
        return await fs.readFile(filePath);
      } catch {
        return undefined;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      const filePath = resolvePath(key);
      if (!filePath) return;
      if (!Buffer.isBuffer(value) && typeof value !== 'string') {
        throw new Error(
          `fs store persists Buffer or string values only, received ${typeof value}`,
        );
      }
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, value);
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
