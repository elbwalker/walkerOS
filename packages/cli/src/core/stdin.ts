import fs from 'fs-extra';
import path from 'path';
import { getTmpPath } from './tmp.js';

export function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const content = Buffer.concat(chunks).toString('utf-8');
  if (!content.trim()) {
    throw new Error('No input received on stdin');
  }
  return content;
}

/**
 * Read stdin content and write to a labeled temp file.
 * Returns the temp file path for downstream functions that expect file paths.
 */
export async function readStdinToTempFile(label: string): Promise<string> {
  const content = await readStdin();
  const tmpPath = getTmpPath(undefined, `stdin-${label}.json`);
  await fs.ensureDir(path.dirname(tmpPath));
  await fs.writeFile(tmpPath, content, 'utf-8');
  return tmpPath;
}
