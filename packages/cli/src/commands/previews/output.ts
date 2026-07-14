export interface FormatOptions {
  url?: string;
}

export interface FormatResult {
  stdoutLast: string;
  stderr: string;
}

export interface PreviewPrintable {
  id: string;
  token: string;
  activationUrl: string;
  bundleUrl: string;
  createdBy: string;
  createdAt: string;
}

export function formatPreviewCreated(
  preview: PreviewPrintable,
  options: FormatOptions,
): FormatResult {
  // The activation URL is always server-minted: an app-signed, origin-bound
  // grant. The CLI cannot forge one for an arbitrary origin, so it never
  // reconstructs it client-side and never puts the raw ingest token in a URL.
  // For --url, createPreview already re-minted it for the target origin, so we
  // echo it verbatim here.
  const stdoutLast = preview.activationUrl;
  let deactivationUrl: string | null = null;

  if (options.url) {
    // Deactivation uses the `off` clear-sentinel (not a grant), so it is safe
    // to build client-side. `new URL` throws TypeError on invalid input.
    const off = new URL(options.url);
    off.searchParams.set('elbPreview', 'off');
    deactivationUrl = off.toString();
  }

  const lines = [
    `Preview created (${preview.id})`,
    `  Token:      ${preview.token}`,
    `  Created by: ${preview.createdBy}`,
    `  Bundle URL: ${preview.bundleUrl}`,
    '',
    options.url
      ? `  Activate:   ${stdoutLast}`
      : `  Activate:   Append ${stdoutLast} to any URL on your site`,
    deactivationUrl
      ? `  Deactivate: ${deactivationUrl}`
      : `  Deactivate: Append ?elbPreview=off to any URL on your site`,
    '',
  ];

  return { stdoutLast, stderr: lines.join('\n') };
}

export function printPreviewCreated(
  preview: PreviewPrintable,
  options: FormatOptions,
): void {
  const { stdoutLast, stderr } = formatPreviewCreated(preview, options);
  process.stderr.write(stderr + '\n');
  process.stdout.write(stdoutLast + '\n');
}
