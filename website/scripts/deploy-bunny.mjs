import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const API_KEY = process.env.BUNNY_API_KEY;
const PULLZONE_URL = process.env.BUNNY_PULLZONE_URL;
const DEPLOY_PATH = process.env.DEPLOY_PATH || ''; // e.g., 'preview/pr-123' for PR previews
const STORAGE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

async function uploadFile(localPath, remotePath) {
  const content = await readFile(localPath);
  const fullPath = DEPLOY_PATH ? `${DEPLOY_PATH}/${remotePath}` : remotePath;
  const res = await fetch(`${STORAGE_URL}/${fullPath}`, {
    method: 'PUT',
    headers: { AccessKey: STORAGE_PASSWORD, 'Content-Type': 'application/octet-stream' },
    body: content,
  });
  if (!res.ok) throw new Error(`Upload failed: ${fullPath} (${res.status})`);
  console.log(`✓ ${fullPath}`);
}

async function purgeCache() {
  const purgePath = DEPLOY_PATH ? `${PULLZONE_URL}/${DEPLOY_PATH}/*` : `${PULLZONE_URL}/*`;
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
      console.warn(`Purge attempt ${attempt}/${maxAttempts} failed: ${res.status}`);
    } catch (err) {
      if (err.message?.startsWith('Purge failed:')) throw err;
      console.warn(`Purge attempt ${attempt}/${maxAttempts} error: ${err.message}`);
    }

    if (attempt < maxAttempts) {
      const delay = Math.min(2000 * 2 ** (attempt - 1), 30_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Upload already succeeded; a failed purge only delays cache eviction.
  // Don't fail the deploy — warn loudly so the job stays green.
  console.warn('::warning::Cache purge failed after retries — new content will propagate as edge TTLs expire.');
}

async function deploy() {
  const outDir = 'build';
  const files = await getFiles(outDir);
  console.log(`Uploading ${files.length} files${DEPLOY_PATH ? ` to /${DEPLOY_PATH}` : ''}...`);

  for (const file of files) {
    const remotePath = relative(outDir, file);
    await uploadFile(file, remotePath);
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
