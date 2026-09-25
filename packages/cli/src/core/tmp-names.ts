import path from 'path';
import fs from 'fs-extra';
import { getTmpPath } from './tmp.js';

/** What a per-run temp dir is for; names the middle path segment. */
export type TmpRunKind =
  | 'push'
  | 'build'
  | 'bundle'
  | 'wrap'
  | 'archive'
  | 'setup';

/**
 * Create a unique per-run temp dir `<root>/walkeros/<kind>/<6 chars>`.
 *
 * Every segment stays short, so log redaction never mistakes a temp path for
 * a secret-shaped token run (a timestamp plus a random suffix, or a UUID, is
 * exactly that shape). The caller removes the dir when done.
 */
export async function tmpRunDir(
  kind: TmpRunKind,
  tmpDir?: string,
): Promise<string> {
  const parent = getTmpPath(tmpDir, 'walkeros', kind);
  await fs.ensureDir(parent);
  return fs.mkdtemp(parent + path.sep);
}
