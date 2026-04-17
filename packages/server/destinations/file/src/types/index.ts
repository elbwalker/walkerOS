import type {
  Destination as CoreDestination,
  Mapping as CoreMapping,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type { WriteStream } from 'node:fs';

export type Format = 'jsonl' | 'tsv' | 'csv';

export interface Settings {
  /**
   * Output filename. Either a static string or a Mapping.Value resolved
   * per event (e.g. tenant sharding via `key`, daily rotation via `$code:` fn).
   * Static filenames are validated and opened at flow startup;
   * dynamic ones at first matching event.
   */
  filename: string | CoreMapping.Value;

  /** Serialisation format. Defaults to 'jsonl'. */
  format?: Format;

  /**
   * Event paths used as columns for tsv/csv formats. Order preserved.
   * Object values are JSON-stringified into a single cell.
   * Required when format is 'tsv' or 'csv'.
   */
  fields?: string[];
}

export type InitSettings = Partial<Settings>;

export interface Mapping {}

/**
 * Minimal write-stream interface used by the destination. Matches the
 * subset of node:fs WriteStream needed for append-only writes. Tests
 * inject a fake implementation via env.fs.
 */
export interface FileWriteStream {
  write: (chunk: string) => boolean;
  end: () => void;
}

export interface Env extends DestinationServer.Env {
  /**
   * Override the file system primitives. Tests inject a fake here so
   * disk writes are captured in memory.
   */
  fs?: {
    createWriteStream: (
      path: string,
      options: { flags: string },
    ) => FileWriteStream | WriteStream;
    mkdir: (path: string, options: { recursive: boolean }) => Promise<void>;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
