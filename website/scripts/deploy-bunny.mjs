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
  const res = await fetch(`https://api.bunny.net/purge?url=${encodeURIComponent(purgePath)}`, {
    method: 'POST',
    headers: { AccessKey: API_KEY },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Purge failed: ${res.status} - ${text}`);
  }
  console.log('✓ Cache purged');
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
