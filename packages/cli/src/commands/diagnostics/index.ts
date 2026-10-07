import { readConfig, resolveAppUrl } from '../../lib/config-file.js';
import { VERSION } from '../../version.js';
import {
  compareContract,
  fetchHealth,
  formatContract,
} from '../../core/contract.js';
import type { ContractComparison, HealthResult } from '../../core/contract.js';
import { writeResult } from '../../core/output.js';

// === Programmatic API ===

/** Where the app URL comes from, in `resolveAppUrl()` order. */
export type AppUrlSource = 'env' | 'config' | 'default';

export interface Diagnostics {
  cli: { version: string };
  appUrl: { resolved: string; source: AppUrlSource };
  app: HealthResult;
  contract: ContractComparison;
}

function appUrlSource(): AppUrlSource {
  if (process.env.WALKEROS_APP_URL) return 'env';
  if (readConfig()?.appUrl) return 'config';
  return 'default';
}

/**
 * This CLI's version, the app it talks to and where that URL comes from, the
 * app's public health route and the contract verdict against the same app.
 * Sends no credential, so it works logged out.
 */
export async function diagnostics(): Promise<Diagnostics> {
  const resolved = resolveAppUrl().replace(/\/+$/, '');
  const [app, contract] = await Promise.all([
    fetchHealth(resolved),
    compareContract({ baseUrl: resolved }),
  ]);
  return {
    cli: { version: VERSION },
    appUrl: { resolved, source: appUrlSource() },
    app,
    contract,
  };
}

/** The report as text lines, one fact each. */
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
    formatContract(report.contract),
  ];
}

// === CLI Command Handler ===

export interface DiagnosticsCommandOptions {
  json?: boolean;
}

/** Prints the report. Exits 0 whatever the verdict. */
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
