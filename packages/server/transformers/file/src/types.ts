import type { Transformer } from '@walkeros/core';

export interface FileSettings {
  /** URL prefix to strip (e.g., "/static" → /static/walker.js looks up "walker.js") */
  prefix?: string;
  /** Default response headers (Cache-Control, etc.) */
  headers?: Record<string, string>;
  /** Extension → Content-Type overrides (keys include dot: { '.wasm': 'application/wasm' }) */
  mimeTypes?: Record<string, string>;
}

export interface FileStore {
  get(key: string): unknown | Promise<unknown>;
}

export interface FileEnv extends Transformer.BaseEnv {
  /** Store providing file content. If not provided, transformer warns and passthroughs. */
  store?: FileStore;
}

export type Types = Transformer.Types<
  FileSettings,
  FileEnv,
  Partial<FileSettings>
>;
