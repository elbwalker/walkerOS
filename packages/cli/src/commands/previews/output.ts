import { spawn } from 'node:child_process';

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
  let stdoutLast: string;
  let deactivationUrl: string | null = null;

  if (options.url) {
    const u = new URL(options.url); // throws TypeError on invalid
    u.searchParams.set('elbPreview', preview.token);
    stdoutLast = u.toString();

    const off = new URL(options.url);
    off.searchParams.set('elbPreview', 'off');
    deactivationUrl = off.toString();
  } else {
    stdoutLast = preview.activationUrl;
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

export async function printPreviewCreated(
  preview: PreviewPrintable,
  options: FormatOptions & { open?: boolean },
): Promise<void> {
  const { stdoutLast, stderr } = formatPreviewCreated(preview, options);
  process.stderr.write(stderr + '\n');
  process.stdout.write(stdoutLast + '\n');

  if (options.open && options.url) {
    const opener =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'start'
          : 'xdg-open';
    spawn(opener, [stdoutLast], { stdio: 'ignore', detached: true }).unref();
  }
}
