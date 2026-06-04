import type { Logger, Store } from '@walkeros/core';
import type {
  ServiceAccountCredentials,
  SheetsStoreSettings,
  Types,
} from './types';
import { createTokenProvider, type TokenProvider } from './auth';
import { setup as sheetsSetup } from './setup';
import {
  SHEETS_BASE,
  buildAppendRange,
  buildCellRange,
  buildColumnRange,
  parseRowFromRange,
  resolveHeaderRows,
  resolveKeyColumn,
  resolveSheet,
  resolveValueColumn,
} from './setup-helpers';

/**
 * Module-level cache for the spreadsheet existence pre-check, keyed by
 * spreadsheet ID. Shared across `storeSheetsInit` invocations so the same
 * spreadsheet is probed at most once per process.
 */
const spreadsheetExistsCache: Map<string, Promise<boolean>> = new Map();

/** @internal Test-only: clear the existence cache. */
export function __resetSpreadsheetExistenceCache(): void {
  spreadsheetExistsCache.clear();
}

/** @internal Test-only: seed the existence cache for a spreadsheet. */
export function __seedSpreadsheetExists(spreadsheetId: string): void {
  spreadsheetExistsCache.set(spreadsheetId, Promise.resolve(true));
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

function parseCredentials(
  credentials?: string | ServiceAccountCredentials,
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
  return credentials;
}

function assertSheetsSettings(
  settings: Partial<SheetsStoreSettings> | undefined,
): asserts settings is SheetsStoreSettings {
  if (
    !settings ||
    typeof settings.id !== 'string' ||
    settings.id.length === 0
  ) {
    throw new Error(
      'storeSheetsInit: settings.id (spreadsheet ID) is required (non-empty string)',
    );
  }
}

async function ensureSpreadsheetExists(
  spreadsheetId: string,
  storeId: string,
  getToken: TokenProvider,
  logger: Logger.Instance,
): Promise<void> {
  const existing = spreadsheetExistsCache.get(spreadsheetId);
  if (existing !== undefined) {
    await existing;
    return;
  }

  const promise = (async (): Promise<boolean> => {
    let res: Response;
    try {
      const token = await getToken();
      const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId`;
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      logger.debug('ensureSpreadsheetExists check failed (non-fatal)', {
        spreadsheetId,
        error: err instanceof Error ? err.message : String(err),
      });
      return true;
    }

    if (res.status === 404) {
      throw new Error(
        `Spreadsheet not found: ${spreadsheetId}. Run "walkeros setup store.${storeId}" to ensure the sheet exists and is shared with the service account.`,
      );
    }
    if (!res.ok) {
      logger.debug('ensureSpreadsheetExists check failed (non-fatal)', {
        spreadsheetId,
        status: res.status,
      });
    }
    return true;
  })();

  spreadsheetExistsCache.set(spreadsheetId, promise);
  try {
    await promise;
  } catch (err) {
    spreadsheetExistsCache.delete(spreadsheetId);
    throw err;
  }
}

interface KeyColumnResponse {
  values?: unknown[];
}

function readKeyColumnRows(payload: unknown): string[] {
  if (!isRecord(payload)) return [];
  const values = (payload as KeyColumnResponse).values;
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const row of values) {
    if (Array.isArray(row) && typeof row[0] === 'string') {
      out.push(row[0]);
    } else {
      out.push('');
    }
  }
  return out;
}

async function buildKeyIndex(
  spreadsheetId: string,
  sheet: string,
  keyCol: string,
  headerRows: number,
  getToken: TokenProvider,
): Promise<Map<string, number>> {
  const token = await getToken();
  const range = buildColumnRange(sheet, keyCol, headerRows + 1);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(
      `storeSheetsInit: failed to read key column (${res.status})`,
    );
  }
  const payload: unknown = await res.json();
  const rows = readKeyColumnRows(payload);
  const index = new Map<string, number>();
  rows.forEach((key, i) => {
    if (key) index.set(key, headerRows + i + 1);
  });
  return index;
}

async function readCell(
  spreadsheetId: string,
  sheet: string,
  column: string,
  row: number,
  getToken: TokenProvider,
): Promise<string | undefined> {
  const token = await getToken();
  const range = buildCellRange(sheet, column, row);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const payload: unknown = await res.json();
  if (!isRecord(payload)) return undefined;
  const values = (payload as KeyColumnResponse).values;
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const first = values[0];
  if (!Array.isArray(first) || first.length === 0) return undefined;
  const cell = first[0];
  return typeof cell === 'string' ? cell : undefined;
}

async function writeCell(
  spreadsheetId: string,
  sheet: string,
  column: string,
  row: number,
  value: string,
  getToken: TokenProvider,
): Promise<void> {
  const token = await getToken();
  const range = buildCellRange(sheet, column, row);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]], range }),
  });
  if (!res.ok) {
    throw new Error(`storeSheets.writeCell: write failed (${res.status})`);
  }
}

interface AppendResponse {
  updates?: { updatedRange?: unknown };
}

async function appendRow(
  spreadsheetId: string,
  sheet: string,
  keyCol: string,
  valueCol: string,
  values: [string, string],
  getToken: TokenProvider,
): Promise<number | undefined> {
  const token = await getToken();
  const range = buildAppendRange(sheet, keyCol, valueCol);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) {
    throw new Error(`storeSheets.appendRow: append failed (${res.status})`);
  }
  const payload: unknown = await res.json();
  if (!isRecord(payload)) return undefined;
  const updates = (payload as AppendResponse).updates;
  if (!isRecord(updates)) return undefined;
  const updatedRange = updates.updatedRange;
  if (typeof updatedRange !== 'string') return undefined;
  return parseRowFromRange(updatedRange);
}

export const storeSheetsInit: Store.Init<Types> = async (context) => {
  assertSheetsSettings(context.config.settings);
  const settings: SheetsStoreSettings = context.config.settings;
  const { logger } = context;
  const id = context.id;
  const creds = parseCredentials(settings.credentials);
  const getToken = createTokenProvider(creds);
  const sheet = resolveSheet(settings);
  const keyCol = resolveKeyColumn(settings);
  const valueCol = resolveValueColumn(settings);
  const headerRows = resolveHeaderRows(settings);

  await ensureSpreadsheetExists(settings.id, id, getToken, logger);

  const keyToRow = await buildKeyIndex(
    settings.id,
    sheet,
    keyCol,
    headerRows,
    getToken,
  );

  const config: Store.Config<Types> = {
    settings,
    env: context.config.env,
    id: context.config.id,
    logger: context.config.logger,
  };

  return {
    type: 'sheets',
    config,
    setup: sheetsSetup,

    async get(key: string): Promise<unknown> {
      const row = keyToRow.get(key);
      if (row === undefined) return undefined;
      const cell = await readCell(settings.id, sheet, valueCol, row, getToken);
      if (cell === undefined || cell === '') return undefined;
      try {
        return JSON.parse(cell);
      } catch (err) {
        logger.debug('storeSheets.get: JSON parse failed', {
          key,
          error: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      // The request-cache codec hands stores an encoded Buffer (via
      // encodeCacheValue). Sheets would JSON.stringify it into
      // {"type":"Buffer","data":[...]} and return that object as a HIT with no
      // TTL check on read, serving silent stale garbage. Sheets is not a request-cache
      // backend; reject the Buffer case loudly. Non-Buffer JSON values are
      // unaffected.
      if (Buffer.isBuffer(value)) {
        throw new Error(
          'Sheets store cannot be used as a request cache; use fs, s3, gcs, or an in-memory store',
        );
      }
      const serialized = JSON.stringify(value);
      const existingRow = keyToRow.get(key);
      if (existingRow === undefined) {
        const newRow = await appendRow(
          settings.id,
          sheet,
          keyCol,
          valueCol,
          [key, serialized],
          getToken,
        );
        if (newRow !== undefined) keyToRow.set(key, newRow);
      } else {
        await writeCell(
          settings.id,
          sheet,
          valueCol,
          existingRow,
          serialized,
          getToken,
        );
      }
    },

    async delete(key: string): Promise<void> {
      const row = keyToRow.get(key);
      if (row === undefined) return;
      await writeCell(settings.id, sheet, valueCol, row, '', getToken);
    },
  };
};
