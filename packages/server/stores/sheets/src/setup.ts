import type { LifecycleContext, SetupFn, Store } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type {
  ServiceAccountCredentials,
  Setup,
  SheetsStoreSettings,
  Types,
} from './types';
import { createTokenProvider } from './auth';
import { resolveCredentials } from './credentials';
import { SHEETS_BASE, buildHeaderRange, resolveSheet } from './setup-helpers';

/**
 * Default setup options. `headers` is intentionally omitted so callers must
 * opt in to writing a header row.
 */
export const DEFAULT_SETUP: Setup = {};

export interface SetupResult {
  headersWritten: boolean;
}

/**
 * Public alias kept for callers that imported the prior shape.
 * Equivalent to the framework's `Store.Config<Types>`.
 */
export type SheetsStoreConfig = Store.Config<Types>;

/**
 * Provision a Google Sheets store described in the flow config.
 * Verifies the spreadsheet exists and (idempotently) writes the configured
 * `setup.headers` row. Never alters existing data: re-running with the same
 * headers is a no-op overwrite.
 */
export const setup: SetupFn<SheetsStoreConfig, Store.BaseEnv> = async (
  context: LifecycleContext<SheetsStoreConfig, Store.BaseEnv>,
) => {
  const { config, logger, id } = context;
  const options = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!options) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }

  assertSheetsSettings(config.settings);
  const settings = config.settings;

  const creds = parseCredentials(resolveCredentials(config, logger));
  const getToken = createTokenProvider(creds);
  const token = await getToken();

  const probeUrl = `${SHEETS_BASE}/${encodeURIComponent(settings.id)}?fields=spreadsheetId`;
  const probeRes = await fetch(probeUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (probeRes.status === 404) {
    throw new Error(
      `Spreadsheet not found: ${settings.id}. Run "walkeros setup store.${id}" to ensure the sheet exists and is shared with the service account.`,
    );
  }
  if (!probeRes.ok) {
    const text = await safeText(probeRes);
    throw new Error(
      `setup: spreadsheet probe failed (${probeRes.status}): ${text}`,
    );
  }

  let headersWritten = false;
  if (options.headers && options.headers.length > 0) {
    const sheet = resolveSheet(settings);
    const range = buildHeaderRange(sheet, options.headers.length);
    const url = `${SHEETS_BASE}/${encodeURIComponent(settings.id)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    const body = { values: [options.headers], range };
    const writeRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!writeRes.ok) {
      const text = await safeText(writeRes);
      throw new Error(
        `setup: header write failed (${writeRes.status}): ${text}`,
      );
    }
    headersWritten = true;
    logger.info('setup: headers written', {
      spreadsheetId: settings.id,
      headers: options.headers.length,
    });
  } else {
    logger.debug('setup: spreadsheet verified, no headers configured', {
      spreadsheetId: settings.id,
    });
  }

  return { headersWritten };
};

function assertSheetsSettings(
  settings: Partial<SheetsStoreSettings> | undefined,
): asserts settings is SheetsStoreSettings {
  if (
    !settings ||
    typeof settings.id !== 'string' ||
    settings.id.length === 0
  ) {
    throw new Error('setup: settings.id (spreadsheet ID) is required');
  }
}

function parseCredentials(
  credentials?: unknown,
): ServiceAccountCredentials | undefined {
  if (!credentials) return undefined;
  if (typeof credentials === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(credentials);
    } catch {
      return undefined;
    }
    if (isServiceAccountShape(parsed)) return parsed;
    return undefined;
  }
  if (isServiceAccountShape(credentials)) return credentials;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isServiceAccountShape(
  value: unknown,
): value is ServiceAccountCredentials {
  if (!isRecord(value)) return false;
  return (
    typeof value.client_email === 'string' &&
    typeof value.private_key === 'string'
  );
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
