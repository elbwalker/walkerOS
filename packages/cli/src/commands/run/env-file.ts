/**
 * Opt-in dotenv loader for `walkeros run --env-file <path>`.
 *
 * Deliberately minimal and dependency-free:
 * - Loads only when explicitly pointed at a file. No auto-discovery of `.env`.
 * - Existing `process.env` keys always win; the file never overrides them.
 * - Refuses to read a file that is group/other readable on POSIX, because a
 *   dotenv file holds secrets and a world-readable secret file is a leak.
 * - Values are process-local and never logged.
 */

import { readFileSync, statSync } from 'fs';

/**
 * Parse a single `KEY=VALUE` line. Returns undefined for comments, blanks,
 * and malformed lines. Handles surrounding single or double quotes.
 */
function parseLine(line: string): { key: string; value: string } | undefined {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return undefined;

  const eq = trimmed.indexOf('=');
  if (eq <= 0) return undefined;

  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return undefined;

  let value = trimmed.slice(eq + 1).trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

/**
 * Load environment variables from an explicit dotenv file into process.env.
 * Existing keys are preserved. Throws on a missing file or on a file that is
 * readable by group/other (insecure permissions).
 */
export function loadEnvFile(filePath: string): void {
  // statSync throws ENOENT for a missing file, which surfaces as a clear error.
  const stats = statSync(filePath);

  // POSIX permission check: refuse if group (0o040) or other (0o004) can read.
  // Windows reports mode bits that do not model group/other, so this guard is a
  // no-op there (group/other read bits are not meaningfully set).
  if (process.platform !== 'win32') {
    const mode = stats.mode & 0o777;
    if (mode & 0o044) {
      throw new Error(
        `Refusing to load env file "${filePath}": it is readable by group or other ` +
          `(mode ${mode.toString(8).padStart(3, '0')}). ` +
          `Restrict it with: chmod 600 ${filePath}`,
      );
    }
  }

  const content = readFileSync(filePath, 'utf-8');

  for (const rawLine of content.split(/\r?\n/)) {
    const parsed = parseLine(rawLine);
    if (!parsed) continue;
    // Existing env wins: never override an already-set key.
    if (Object.prototype.hasOwnProperty.call(process.env, parsed.key)) continue;
    process.env[parsed.key] = parsed.value;
  }
}
