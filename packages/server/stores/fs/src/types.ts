export interface FsStoreSettings {
  /** Root directory for file lookups. All keys resolved relative to this. */
  basePath: string;
}

/** The file operations the store uses; `fs/promises` by default. */
export interface FsStoreFs {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  mkdir(path: string, options: { recursive: true }): Promise<unknown>;
  unlink(path: string): Promise<void>;
}

export interface FsStoreEnv {
  /** Replaces `fs/promises`, for tests and simulation. */
  fs?: FsStoreFs;
}
