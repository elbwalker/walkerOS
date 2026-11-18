/**
 * The runner process's private folder: one per process, under the temp
 * directory, readable by its own user only. Whatever the process writes
 * there (a fetched or extracted bundle outside the image) never touches a
 * file another tool or another runner on the same host owns.
 */

import { rmSync } from 'fs';
import { mkdtemp } from 'fs/promises';
import os from 'os';
import { join } from 'path';
import { getErrorMessage } from '@walkeros/core';

/** Makes a new `walkeros-XXXXXX` folder under `os.tmpdir()`, mode 0700. */
export async function createInstanceFolder(): Promise<string> {
  const parent = os.tmpdir();
  try {
    return await mkdtemp(join(parent, 'walkeros-'));
  } catch (error) {
    throw new Error(
      `The instance folder under ${parent} cannot be made: ${getErrorMessage(error)}`,
    );
  }
}

/**
 * Removes the folder and everything in it. It runs in the process's exit
 * handler, where a throw would replace the exit code, so a failure is
 * ignored: a folder left behind is the temp directory's to clear.
 */
export function removeInstanceFolder(folder: string): void {
  try {
    rmSync(folder, { recursive: true, force: true });
  } catch {
    // Ignored, as above.
  }
}
