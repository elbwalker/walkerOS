/**
 * Unified Temporary Directory Manager
 *
 * Manages temporary directories for CLI operations using hash-based naming.
 * This provides a single location for all temp files per operation, making
 * cleanup simple and Docker mounting straightforward.
 */

import { getHashServer } from '@walkeros/server-core';
import path from 'path';
import fs from 'fs-extra';

export interface TempDirPaths {
  root: string;
  nodeModules: string;
  cache: string;
  bundle: string;
  entry: string;
}

/**
 * Manages a unified temporary directory structure for CLI operations
 */
export class TempDirManager {
  private hash: string;
  public readonly paths: TempDirPaths;

  /**
   * Create a new TempDirManager with hash-based directory naming
   *
   * @param configPath - Path to the config file (used in hash)
   * @param operation - Operation type ('bundle' | 'simulate')
   * @param timestamp - Optional timestamp for uniqueness (defaults to Date.now())
   */
  static async create(
    configPath: string,
    operation: 'bundle' | 'simulate',
    timestamp?: number,
  ): Promise<TempDirManager> {
    const ts = timestamp || Date.now();
    const hash = await getHashServer(`${configPath}:${operation}:${ts}`, 12);
    return new TempDirManager(hash);
  }

  constructor(hash: string) {
    this.hash = hash;
    const root = path.join('.tmp', `walkeros-${hash}`);

    this.paths = {
      root,
      nodeModules: path.join(root, 'node_modules'),
      cache: path.join(root, 'cache'),
      bundle: path.join(root, 'bundle.js'),
      entry: path.join(root, 'entry.js'),
    };
  }

  /**
   * Initialize the temporary directory structure
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.paths.root);
    await fs.ensureDir(this.paths.nodeModules);
    await fs.ensureDir(this.paths.cache);
  }

  /**
   * Clean up the temporary directory
   */
  async cleanup(): Promise<void> {
    await fs.remove(this.paths.root);
  }

  /**
   * Get the hash used for this temp directory
   */
  getHash(): string {
    return this.hash;
  }

  /**
   * Get a path within the temp directory
   */
  getPath(...parts: string[]): string {
    return path.join(this.paths.root, ...parts);
  }

  /**
   * Check if the temp directory exists
   */
  async exists(): Promise<boolean> {
    return fs.pathExists(this.paths.root);
  }
}
