/**
 * Resolve bundle input to a local file path
 *
 * Priority order:
 * 1. Local file (exists) - BUNDLE points to an existing local file
 *    - `.tar.gz`/`.tgz` archives are extracted (gzip is not ESM)
 *    - everything else is imported directly
 * 2. URL                - BUNDLE is an http(s) URL
 *    - the body is buffered once; gzip magic bytes (or an archive suffix or
 *      content-type hint) route it to extraction
 *    - text content is written to writePath
 * 3. Stdin              - data piped into the process (empty stdin is skipped)
 * 4. File path (fallback) - BUNDLE path that doesn't exist yet
 */

import {
  createReadStream,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { Readable } from 'stream';
import { x as tarExtract } from 'tar';
import { isStdinPiped, readStdin } from './stdin.js';
import { fetchWithRetry } from './fetch-retry.js';

/** Entry the runtime expects at the root of an extracted archive. */
const ARCHIVE_ENTRY = 'flow.mjs';

/**
 * Determine where to write fetched/stdin bundles.
 * In Docker: /app/flow/ exists → write there (module resolution works naturally).
 * Local dev: falls back to /tmp/.
 */
function getDefaultWritePath(): string {
  if (existsSync('/app/flow')) return '/app/flow/flow.mjs';
  return '/tmp/walkeros-flow.mjs';
}

export type BundleSource = 'stdin' | 'url' | 'file' | 'archive';

export interface ResolvedBundle {
  /** Absolute file path to the bundle (ready for import()) */
  path: string;
  /** How the bundle was provided */
  source: BundleSource;
}

/**
 * Detect whether a string is an HTTP(S) URL
 */
function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

/**
 * Whether a resolved path has the shape of a prebuilt artifact the runtime
 * can import (or an archive holding one). This runtime cannot bundle, so
 * anything else (a `.json` flow config above all) is refused, not built.
 */
export function isPrebuiltArtifact(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.endsWith('.mjs') ||
    lower.endsWith('.js') ||
    lower.endsWith('.cjs') ||
    lower.endsWith('.tar.gz') ||
    lower.endsWith('.tgz')
  );
}

/** Whether a buffer starts with the gzip magic bytes (1f 8b). */
export function isGzip(body: Uint8Array): boolean {
  return body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b;
}

/**
 * Hint that a bundle reference points at a tar archive: the path part
 * (query/hash stripped so presigned URLs work) ends in `.tar.gz` / `.tgz`, or
 * the content-type names gzip or x-tar. For a URL this is a HINT only: the
 * fetched body's magic bytes can route to extraction without it (see
 * `resolveBundle`).
 */
export function isArchive(value: string, contentType?: string | null): boolean {
  const path = value.split('?')[0].split('#')[0].toLowerCase();
  if (path.endsWith('.tar.gz') || path.endsWith('.tgz')) return true;

  if (contentType) {
    const type = contentType.toLowerCase();
    if (type.includes('gzip') || type.includes('x-tar')) return true;
  }

  return false;
}

/**
 * Write bundle content to disk, ensuring parent directory exists.
 */
function writeBundleToDisk(writePath: string, content: string): void {
  const dir = dirname(writePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(writePath, content, 'utf-8');
}

/**
 * Perform the HTTP request and return the Response.
 *
 * fetchWithRetry bounds each attempt with a 30s timeout that is cleared once
 * the response headers arrive, so it never aborts body streaming downstream,
 * and retries transient failures (timeouts, connection
 * errors, 5xx, 429) so a brief control-plane blip during cold start no longer
 * hard-fails the boot. A non-retryable status (e.g. a 404) comes back as a
 * Response and is turned into the precise error below.
 */
async function fetchOk(url: string): Promise<Response> {
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch bundle from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

/**
 * Write a fetched text body to disk as the bundle.
 */
function writeTextBundle(body: Buffer, writePath: string): string {
  const content = body.toString('utf-8');

  if (!content.trim()) {
    throw new Error(`Bundle is empty`);
  }

  writeBundleToDisk(writePath, content);
  return writePath;
}

/**
 * Pipe a Node readable through tar extraction into destDir and await
 * completion, then assert the expected entry landed.
 *
 * The 30s request timeout (fetchOk) only covers obtaining the response; the
 * extract itself is deliberately left unbounded. A multi-MB node_modules on a
 * cold container can take longer than 30s to unpack, and no abort signal is
 * wired into this pipe, so the body stream runs to completion regardless of
 * the per-request timeout, which fetchWithRetry clears once the response
 * headers arrive.
 */
async function extractToDir(
  source: Readable,
  destDir: string,
): Promise<string> {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // destDir is stable across runs (e.g. /app/flow in a long-lived container).
  // Wipe the full extracted footprint first so a prior run's node_modules/ or
  // package.json can't shadow the new archive, and the post-extract existence
  // check proves THIS archive delivered flow.mjs, not a leftover.
  const entryPath = join(destDir, ARCHIVE_ENTRY);
  for (const member of [ARCHIVE_ENTRY, 'node_modules', 'package.json']) {
    rmSync(join(destDir, member), { recursive: true, force: true });
  }

  const extract = tarExtract({ cwd: destDir });

  await new Promise<void>((resolve, reject) => {
    source.on('error', reject);
    extract.on('error', reject);
    // 'close' is the reliable terminal event for the tar write stream; 'finish'
    // can fire before all entries are flushed in some tar versions.
    extract.on('close', resolve);
    source.pipe(extract);
  });

  if (!existsSync(entryPath)) {
    throw new Error(
      `Archive did not contain ${ARCHIVE_ENTRY} after extraction to ${destDir}`,
    );
  }

  return entryPath;
}

/**
 * Buffer a fetched bundle body fully. Piping the fetch body straight into tar
 * couples undici's parser to tar's backpressure: if the socket ends while the
 * consumer has the stream paused, undici asserts (`assert(!this.paused)`) and
 * kills the process. Bundles are a few MB, so buffering is cheap, decouples
 * download from extraction, and lets the magic bytes decide the route.
 */
async function readBody(response: Response): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Resolve the bundle to a local file path
 *
 * @param bundleEnv - Value of the BUNDLE env var (path or URL)
 * @returns Resolved bundle with file path and source type
 */
export async function resolveBundle(
  bundleEnv: string,
): Promise<ResolvedBundle> {
  const writePath = getDefaultWritePath();
  const archiveDestDir = dirname(writePath);

  // 1. If BUNDLE points to an existing local file, use it directly.
  //    This prevents false stdin detection in Docker detached mode.
  //    A local archive must be extracted (gzip is not ESM), not imported.
  if (!isUrl(bundleEnv) && existsSync(bundleEnv)) {
    if (isArchive(bundleEnv)) {
      const path = await extractToDir(
        createReadStream(bundleEnv),
        archiveDestDir,
      );
      return { path, source: 'archive' };
    }
    return { path: bundleEnv, source: 'file' };
  }

  // 2. URL: check before stdin to avoid false stdin detection in containers
  //    (process.stdin.isTTY is undefined in non-interactive shells/Docker)
  if (isUrl(bundleEnv)) {
    const response = await fetchOk(bundleEnv);
    const body = await readBody(response);

    // The body decides: gzip magic bytes route to extraction even at a URL
    // with no archive suffix served as application/octet-stream (which would
    // otherwise be written to disk as text). Suffix and content-type remain
    // hints, so an uncompressed tar that declares itself still extracts.
    if (
      isGzip(body) ||
      isArchive(bundleEnv, response.headers.get('content-type'))
    ) {
      const path = await extractToDir(Readable.from(body), archiveDestDir);
      return { path, source: 'archive' };
    }

    const path = writeTextBundle(body, writePath);
    return { path, source: 'url' };
  }

  // 3. Stdin pipe (only when BUNDLE is not a file or URL). An EMPTY stdin is
  //    not a bundle: a detached container's stdin is /dev/null, so falling
  //    through lets the caller report the missing file, which is the real
  //    cause (typically a Dockerfile that forgot to copy the build output).
  if (isStdinPiped()) {
    const content = await readStdin();
    if (content.trim()) {
      writeBundleToDisk(writePath, content);
      return { path: writePath, source: 'stdin' };
    }
  }

  // 4. File path (fallback: the file may not exist; the caller's existence
  //    check turns that into a diagnosable refusal)
  return { path: bundleEnv, source: 'file' };
}
