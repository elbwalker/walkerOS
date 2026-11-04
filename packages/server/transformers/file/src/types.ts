import type { RespondFn, Store, Transformer } from '@walkeros/core';

export interface FileSettings {
  /**
   * URL prefix the step owns, stripped before the store lookup (e.g.,
   * "/static" → /static/walker.js looks up "walker.js"). A missing file
   * inside the prefix answers 404; a path outside it passes on. "/" owns
   * every path routed to the step. Without a prefix the step owns nothing and
   * a missing file passes on.
   */
  prefix?: string;
  /** Default response headers (Cache-Control, etc.) */
  headers?: Record<string, string>;
  /** Extension → Content-Type overrides (keys include dot: { '.wasm': 'application/wasm' }) */
  mimeTypes?: Record<string, string>;
}

export interface FileEnv extends Transformer.BaseEnv {
  /**
   * Store providing file content (required). Without one, or with a value
   * that has no `get` function such as an unresolved `$store.<id>` string,
   * the step refuses to start with a `config` error.
   */
  store?: Store.Instance;
  /** The request's respond function, set by the source per request. */
  respond?: RespondFn;
}

export type Types = Transformer.Types<
  FileSettings,
  FileEnv,
  Partial<FileSettings>
>;
