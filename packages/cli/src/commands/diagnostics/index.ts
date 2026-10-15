import { readConfig, resolveAppUrl } from '../../lib/config-file.js';
import { VERSION } from '../../version.js';
import { appFetch } from '../../core/app-fetch.js';
import { APP_PATHS } from '../../core/app-paths.js';
import { fetchFailureReason } from '../../core/fetch-failure.js';
import { writeResult } from '../../core/output.js';

// === Programmatic API ===

/** Where the app URL comes from, in `resolveAppUrl()` order. */
export type AppUrlSource = 'env' | 'config' | 'default';

export interface HealthResult {
  reachable: boolean;
  status?: string;
  appVersion?: string;
  /** The HTTP status, when the app answered with a non-2xx one. */
  httpStatus?: number;
  /** Why the ping failed, when it did not reach the app. */
  error?: string;
}

export interface Diagnostics {
  cli: { version: string };
  appUrl: { resolved: string; source: AppUrlSource };
  app: HealthResult;
}

const HEALTH_TIMEOUT_MS = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function appUrlSource(): AppUrlSource {
  if (process.env.WALKEROS_APP_URL) return 'env';
  if (readConfig()?.appUrl) return 'config';
  return 'default';
}

/**
 * Ping the app's public health route without a credential. Resolves
 * `{ reachable: false, error }` only when the request did not reach the app;
 * a non-2xx status still counts as reachable and is named in `httpStatus`.
 * `baseUrl` defaults to `resolveAppUrl()`.
 */
export async function fetchHealth(baseUrl?: string): Promise<HealthResult> {
  try {
    const response = await appFetch(APP_PATHS.health, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      ...(baseUrl === undefined ? {} : { baseUrl }),
    });
    const body: unknown = await response.json().catch(() => undefined);
    const result: HealthResult = { reachable: true };
    if (!response.ok) result.httpStatus = response.status;
    if (isRecord(body)) {
      if (typeof body.status === 'string') result.status = body.status;
      if (typeof body.appVersion === 'string')
        result.appVersion = body.appVersion;
    }
    return result;
  } catch (error) {
    return {
      reachable: false,
      error: fetchFailureReason(error, HEALTH_TIMEOUT_MS),
    };
  }
}

/**
 * This CLI's version, the app it talks to and where that URL comes from, and
 * whether the app answers its health route. Sends no credential, so it works
 * logged out.
 */
export async function diagnostics(): Promise<Diagnostics> {
  const resolved = resolveAppUrl().replace(/\/+$/, '');
  return {
    cli: { version: VERSION },
    appUrl: { resolved, source: appUrlSource() },
    app: await fetchHealth(resolved),
  };
}

/** The report as three text lines: cli, app, health. */
export function formatDiagnostics(report: Diagnostics): string[] {
  const { app } = report;
  const health = app.reachable
    ? [
        'health reachable',
        ...(app.httpStatus !== undefined ? [`HTTP ${app.httpStatus}`] : []),
        ...(app.status !== undefined ? [`status ${app.status}`] : []),
        ...(app.appVersion !== undefined ? [`app ${app.appVersion}`] : []),
      ].join(', ')
    : `health unreachable (${app.error ?? 'no response'})`;
  return [
    `cli ${report.cli.version}`,
    `app ${report.appUrl.resolved} (${report.appUrl.source})`,
    health,
  ];
}

// === CLI Command Handler ===

export interface DiagnosticsCommandOptions {
  json?: boolean;
}

/** Prints the report. Exits 0 whether or not the app answers. */
export async function diagnosticsCommand(
  options: DiagnosticsCommandOptions,
): Promise<void> {
  const report = await diagnostics();
  await writeResult(
    options.json
      ? JSON.stringify(report, null, 2)
      : formatDiagnostics(report).join('\n'),
    {},
  );
}
