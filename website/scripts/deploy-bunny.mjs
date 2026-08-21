import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const API_KEY = process.env.BUNNY_API_KEY;
const PULLZONE_URL = process.env.BUNNY_PULLZONE_URL;
const DEPLOY_PATH = process.env.DEPLOY_PATH || ''; // e.g., 'preview/pr-123' for PR previews
const STORAGE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;
// Prune scope prefix: '' for production (zone root), '<DEPLOY_PATH>/' for previews.
const SCOPE = DEPLOY_PATH ? `${DEPLOY_PATH}/` : '';

const PRUNE_DRY_RUN = process.env.PRUNE_DRY_RUN === '1';
const PRUNE_FORCE = process.env.PRUNE_FORCE === '1';
// A build below this size is treated as broken rather than as a site that
// shrank; prune refuses to run so a failed build can never empty the zone.
const PRUNE_MIN_LOCAL_FILES = Number(process.env.PRUNE_MIN_LOCAL_FILES || 50);
// Extra scope-relative prefixes to protect, comma-separated.
const PRUNE_EXCLUDE = (process.env.PRUNE_EXCLUDE || '')
  .split(',')
  .map((p) => p.trim().replace(/\/+$/, ''))
  .filter(Boolean);

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
}

async function uploadFile(localPath, remotePath) {
  const content = await readFile(localPath);
  const fullPath = DEPLOY_PATH ? `${DEPLOY_PATH}/${remotePath}` : remotePath;
  const res = await fetch(`${STORAGE_URL}/${fullPath}`, {
    method: 'PUT',
    headers: {
      AccessKey: STORAGE_PASSWORD,
      'Content-Type': 'application/octet-stream',
    },
    body: content,
  });
  if (!res.ok) throw new Error(`Upload failed: ${fullPath} (${res.status})`);
  console.log(`✓ ${fullPath}`);
}

// Retry transient storage-API failures (5xx, 429, network); return definitive
// responses (2xx and other 4xx) to the caller.
async function storageFetch(url, options) {
  const maxAttempts = 3;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || (res.status < 500 && res.status !== 429)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

// A production deploy owns the zone root EXCEPT PR previews (deployed under
// preview/ by this same script) and Bunny-internal __*__ folders. A preview
// deploy owns its own prefix entirely.
function isProtected(relPath) {
  if (PRUNE_EXCLUDE.some((p) => relPath === p || relPath.startsWith(`${p}/`))) {
    return true;
  }
  if (DEPLOY_PATH) return false;
  return (
    relPath === 'preview' ||
    relPath.startsWith('preview/') ||
    /^__[^/]*__(\/|$)/.test(relPath)
  );
}

// Recursively list files under the deploy scope, as scope-relative paths.
async function listRemoteFiles(dir = '') {
  const res = await storageFetch(`${STORAGE_URL}/${SCOPE}${dir}`, {
    headers: { AccessKey: STORAGE_PASSWORD, Accept: 'application/json' },
  });
  if (res.status === 404) return []; // scope does not exist yet
  if (!res.ok) throw new Error(`List failed: /${SCOPE}${dir} (${res.status})`);
  const entries = await res.json();
  const files = [];
  for (const entry of entries) {
    const rel = `${dir}${entry.ObjectName}`;
    if (entry.IsDirectory) {
      if (!isProtected(rel)) files.push(...(await listRemoteFiles(`${rel}/`)));
    } else if (!isProtected(rel)) {
      files.push(rel);
    }
  }
  return files;
}

async function deleteRemoteFile(rel) {
  const res = await storageFetch(`${STORAGE_URL}/${SCOPE}${rel}`, {
    method: 'DELETE',
    headers: { AccessKey: STORAGE_PASSWORD },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete failed: ${SCOPE}${rel} (${res.status})`);
  }
  console.log(`✗ ${SCOPE}${rel}`);
}

// The storage zone only ever loses a file through this prune (uploads never
// delete), so removed pages otherwise stay live forever as stale "zombies".
async function pruneRemote(localRelPaths) {
  if (localRelPaths.length < PRUNE_MIN_LOCAL_FILES) {
    console.warn(
      `::warning::Prune skipped: only ${localRelPaths.length} local files (floor ${PRUNE_MIN_LOCAL_FILES}) — build output looks incomplete.`,
    );
    return;
  }
  const local = new Set(localRelPaths);
  const remote = await listRemoteFiles();
  const stale = remote.filter((p) => !local.has(p));
  if (stale.length === 0) {
    console.log('Prune: no stale remote files.');
    return;
  }
  const cap = Math.max(200, Math.ceil(remote.length * 0.25));
  if (stale.length > cap && !PRUNE_FORCE) {
    console.warn(
      `::warning::Prune skipped: ${stale.length} stale of ${remote.length} remote files exceeds the safety cap (${cap}). Inspect with PRUNE_DRY_RUN=1, then set PRUNE_FORCE=1 to prune.`,
    );
    return;
  }
  console.log(
    `Pruning ${stale.length} stale remote file(s)${PRUNE_DRY_RUN ? ' (dry run)' : ''}...`,
  );
  for (const rel of stale) {
    if (PRUNE_DRY_RUN) console.log(`would delete ${SCOPE}${rel}`);
    else await deleteRemoteFile(rel);
  }
}

async function purgeCache() {
  const purgePath = DEPLOY_PATH
    ? `${PULLZONE_URL}/${DEPLOY_PATH}/*`
    : `${PULLZONE_URL}/*`;
  const url = `https://api.bunny.net/purge?url=${encodeURIComponent(purgePath)}`;
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { AccessKey: API_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        console.log('✓ Cache purged');
        return;
      }

      // Retry on 5xx and 429; fail fast on other 4xx (auth, bad URL, etc.)
      if (res.status < 500 && res.status !== 429) {
        const text = await res.text();
        throw new Error(`Purge failed: ${res.status} - ${text.slice(0, 200)}`);
      }
      console.warn(
        `Purge attempt ${attempt}/${maxAttempts} failed: ${res.status}`,
      );
    } catch (err) {
      if (err.message?.startsWith('Purge failed:')) throw err;
      console.warn(
        `Purge attempt ${attempt}/${maxAttempts} error: ${err.message}`,
      );
    }

    if (attempt < maxAttempts) {
      const delay = Math.min(2000 * 2 ** (attempt - 1), 30_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Upload already succeeded; a failed purge only delays cache eviction.
  // Don't fail the deploy — warn loudly so the job stays green.
  console.warn(
    '::warning::Cache purge failed after retries — new content will propagate as edge TTLs expire.',
  );
}

async function deploy() {
  const outDir = 'build';
  const files = await getFiles(outDir);
  console.log(
    `Uploading ${files.length} files${DEPLOY_PATH ? ` to /${DEPLOY_PATH}` : ''}...`,
  );

  for (const file of files) {
    const remotePath = relative(outDir, file);
    await uploadFile(file, remotePath);
  }

  try {
    // Before purge, so edge caches also drop what was deleted.
    await pruneRemote(files.map((file) => relative(outDir, file)));
  } catch (e) {
    // Uploads succeeded; stale files remaining is the pre-prune status quo.
    console.warn(
      `::warning::Prune failed: ${e.message} — stale files remain until the next deploy.`,
    );
  }

  await purgeCache();
  console.log('Deploy complete!');

  if (DEPLOY_PATH) {
    console.log(`Preview URL: ${PULLZONE_URL}/${DEPLOY_PATH}/`);
  }
}

deploy().catch((e) => {
  console.error(e);
  process.exit(1);
});
