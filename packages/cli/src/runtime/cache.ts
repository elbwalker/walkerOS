import {
  existsSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { join } from 'path';

interface CacheMeta {
  version: string;
  timestamp: number;
}

export function writeCache(
  cacheDir: string,
  bundlePath: string,
  configContent: string,
  version: string,
): void {
  mkdirSync(cacheDir, { recursive: true });
  copyFileSync(bundlePath, join(cacheDir, 'bundle.mjs'));
  writeFileSync(join(cacheDir, 'config.json'), configContent, 'utf-8');
  const meta: CacheMeta = { version, timestamp: Date.now() };
  writeFileSync(join(cacheDir, 'meta.json'), JSON.stringify(meta), 'utf-8');
}

export function readCache(
  cacheDir: string,
): { bundlePath: string; version: string } | null {
  try {
    const metaPath = join(cacheDir, 'meta.json');
    const bundlePath = join(cacheDir, 'bundle.mjs');
    if (!existsSync(metaPath) || !existsSync(bundlePath)) return null;
    const meta: CacheMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    return { bundlePath, version: meta.version };
  } catch {
    return null;
  }
}

export function readCacheConfig(cacheDir: string): string | null {
  try {
    const configPath = join(cacheDir, 'config.json');
    if (!existsSync(configPath)) return null;
    return readFileSync(configPath, 'utf-8');
  } catch {
    return null;
  }
}
