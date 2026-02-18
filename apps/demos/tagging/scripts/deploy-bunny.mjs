import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const API_KEY = process.env.BUNNY_API_KEY;
const PULLZONE_URL = process.env.BUNNY_PULLZONE_URL;
const STORAGE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;

const EXCLUDE = new Set(['node_modules', 'scripts', 'package.json', 'package-lock.json', 'README.md']);

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => {
      if (!e.isFile()) return false;
      const rel = relative(dir, join(e.parentPath, e.name));
      return !rel.split('/').some((part) => EXCLUDE.has(part));
    })
    .map((e) => join(e.parentPath, e.name));
}

async function uploadFile(localPath, remotePath) {
  const content = await readFile(localPath);
  const res = await fetch(`${STORAGE_URL}/${remotePath}`, {
    method: 'PUT',
    headers: { AccessKey: STORAGE_PASSWORD, 'Content-Type': 'application/octet-stream' },
    body: content,
  });
  if (!res.ok) throw new Error(`Upload failed: ${remotePath} (${res.status})`);
  console.log(`✓ ${remotePath}`);
}

async function purgeCache() {
  const res = await fetch(`https://api.bunny.net/purge?url=${encodeURIComponent(`${PULLZONE_URL}/*`)}`, {
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
  const files = await getFiles('.');
  console.log(`Uploading ${files.length} files...`);

  for (const file of files) {
    const remotePath = relative('.', file);
    await uploadFile(file, remotePath);
  }

  await purgeCache();
  console.log('Deploy complete!');
}

deploy().catch((e) => {
  console.error(e);
  process.exit(1);
});
