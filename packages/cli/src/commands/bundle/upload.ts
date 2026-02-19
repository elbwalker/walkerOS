/**
 * Bundle URL Upload
 *
 * Handles uploading bundle output to presigned URLs (e.g., S3).
 */

import fs from 'fs-extra';

/**
 * Strip query parameters from a URL for safe logging.
 * Presigned URLs contain sensitive tokens in query params.
 */
export function sanitizeUrl(url: string): string {
  return url.split('?')[0];
}

/**
 * Upload a bundle file to a URL via HTTP PUT.
 *
 * @param filePath - Path to the bundle file to upload
 * @param url - Presigned URL to PUT the bundle to
 * @param timeoutMs - Request timeout in milliseconds (default: 30000)
 */
export async function uploadBundleToUrl(
  filePath: string,
  url: string,
  timeoutMs = 30_000,
): Promise<void> {
  const bundleContent = await fs.readFile(filePath);

  const doUpload = async (attempt: number): Promise<void> => {
    const response = await fetch(url, {
      method: 'PUT',
      body: bundleContent,
      headers: {
        'Content-Type': 'application/javascript',
        'Content-Length': String(bundleContent.length),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status >= 500 && attempt === 1) {
      return doUpload(2);
    }

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText}`,
      );
    }
  };

  await doUpload(1);
}
