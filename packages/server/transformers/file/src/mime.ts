const DEFAULT_MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function getMimeType(
  filePath: string,
  overrides?: Record<string, string>,
): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return 'application/octet-stream';
  const ext = filePath.slice(lastDot).toLowerCase();
  return (
    overrides?.[ext] || DEFAULT_MIME_TYPES[ext] || 'application/octet-stream'
  );
}
