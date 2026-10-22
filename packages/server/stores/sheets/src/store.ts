import type { Logger, Store } from '@walkeros/core';
import { StepError } from '@walkeros/core';
import type {
  ServiceAccountCredentials,
  SheetsStoreSettings,
  Types,
} from './types';
import { createTokenProvider, type TokenProvider } from './auth';
import { resolveCredentials } from './credentials';
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

function assertSheetsSettings(
  settings: Partial<SheetsStoreSettings> | undefined,
): asserts settings is SheetsStoreSettings {
  if (
    !settings ||
    typeof settings.id !== 'string' ||
    settings.id.length === 0
  ) {
    throw new StepError('Config settings id (spreadsheet ID) missing', {
      code: 'config',
    });
  }
}

/** One authorized Sheets request; a failed token or network call throws. */
async function request(
  getToken: TokenProvider,
  doFetch: typeof fetch,
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<Response> {
  try {
    const token = await getToken();
    return await doFetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new StepError('Sheets request failed', {
      code: 'transport',
      cause: err,
    });
  }
}

/** A Sheets answer that is not a success, as a StepError with its status. */
function failedResponse(operation: string, res: Response): StepError {
  return new StepError(`Sheets ${operation} failed (HTTP ${res.status})`, {
    code: 'transport',
    status: res.status,
  });
}

async function ensureSpreadsheetExists(
  spreadsheetId: string,
  storeId: string,
  getToken: TokenProvider,
  logger: Logger.Instance,
  doFetch: typeof fetch,
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
      res = await doFetch(url, {
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
      throw new StepError(
        `Spreadsheet not found: ${spreadsheetId}. Run "walkeros setup store.${storeId}" to ensure the sheet exists and is shared with the service account.`,
        { code: 'config' },
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
  doFetch: typeof fetch,
): Promise<Map<string, number>> {
  const range = buildColumnRange(sheet, keyCol, headerRows + 1);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const res = await request(getToken, doFetch, url);
  if (!res.ok) throw failedResponse('key column read', res);
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
  doFetch: typeof fetch,
): Promise<string | undefined> {
  const range = buildCellRange(sheet, column, row);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const res = await request(getToken, doFetch, url);
  if (!res.ok) throw failedResponse('read', res);
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
  doFetch: typeof fetch,
): Promise<void> {
  const range = buildCellRange(sheet, column, row);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await request(getToken, doFetch, url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[value]], range }),
  });
  if (!res.ok) throw failedResponse('write', res);
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
  doFetch: typeof fetch,
): Promise<number | undefined> {
  const range = buildAppendRange(sheet, keyCol, valueCol);
  const url = `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`;
  const res = await request(getToken, doFetch, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) throw failedResponse('append', res);
  const payload: unknown = await res.json();
  if (!isRecord(payload)) return undefined;
  const updates = (payload as AppendResponse).updates;
  if (!isRecord(updates)) return undefined;
  const updatedRange = updates.updatedRange;
  if (typeof updatedRange !== 'string') return undefined;
  return parseRowFromRange(updatedRange);
}

/**
 * Recursive type guard: a JSON-derived value is structurally a `StoreValue`.
 * Sheets cells hold JSON only, so a parsed cell never carries a `Uint8Array`
 * leaf; the guard narrows the `JSON.parse` result cast-free at the boundary.
 */
function isStoreValue(value: unknown): value is Store.StoreValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return true;
  if (Array.isArray(value)) return value.every(isStoreValue);
  if (typeof value === 'object')
    return Object.values(value).every(isStoreValue);
  return false;
}

/**
 * Recursively detect any binary leaf (Uint8Array, Buffer, or ArrayBuffer)
 * anywhere in a structured value. Buffer is a Uint8Array subclass, so the
 * single `instanceof Uint8Array` check covers it.
 */
function hasBinaryLeaf(value: unknown): boolean {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return true;
  if (Array.isArray(value)) return value.some(hasBinaryLeaf);
  if (typeof value === 'object' && value !== null)
    return Object.values(value).some(hasBinaryLeaf);
  return false;
}

export const storeSheetsInit: Store.Init<Types> = async (context) => {
  assertSheetsSettings(context.config.settings);
  // Sheets stores structured JSON per cell; it cannot serve byte-exact raw
  // bytes. file:true is a hard error at init: pick fs, s3, or gcs instead.
  if (context.config.file) {
    throw new StepError(
      'Sheets store does not support file mode (file: true). Sheets stores structured JSON values per cell. Use fs, s3, or gcs for byte-exact serving.',
      { code: 'config' },
    );
  }
  const settings: SheetsStoreSettings = context.config.settings;
  const { logger } = context;
  const id = context.id;
  const creds = parseCredentials(resolveCredentials(context.config, logger));
  // An injected fetch (tests, simulate) carries every request, token exchange
  // included; the global fetch is the runtime default.
  const doFetch = context.env?.fetch ?? context.config.env?.fetch ?? fetch;
  const getToken = createTokenProvider(creds, doFetch);
  const sheet = resolveSheet(settings);
  const keyCol = resolveKeyColumn(settings);
  const valueCol = resolveValueColumn(settings);
  const headerRows = resolveHeaderRows(settings);

  // The spreadsheet check and the key column read happen at the first
  // operation, so init stays offline; a failed read is retried next time.
  let index: Promise<Map<string, number>> | undefined;
  function keyIndex(): Promise<Map<string, number>> {
    if (!index) {
      const loading = ensureSpreadsheetExists(
        settings.id,
        id,
        getToken,
        logger,
        doFetch,
      ).then(() =>
        buildKeyIndex(
          settings.id,
          sheet,
          keyCol,
          headerRows,
          getToken,
          doFetch,
        ),
      );
      loading.catch(() => {
        if (index === loading) index = undefined;
      });
      index = loading;
    }
    return index;
  }

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

    async get(key: string): Promise<Store.StoreValue | undefined> {
      const row = (await keyIndex()).get(key);
      if (row === undefined) return undefined;
      const cell = await readCell(
        settings.id,
        sheet,
        valueCol,
        row,
        getToken,
        doFetch,
      );
      if (cell === undefined || cell === '') return undefined;
      // A cell that does not hold a stored value is a failed read, never a
      // miss (a blank cell is the miss). The message names no value.
      let parsed: unknown;
      try {
        parsed = JSON.parse(cell);
      } catch (err) {
        throw new StepError('Sheets value could not be decoded', {
          code: 'decode',
          retryable: false,
          cause: err,
        });
      }
      if (!isStoreValue(parsed))
        throw new StepError('Sheets value could not be decoded', {
          code: 'decode',
          retryable: false,
        });
      return parsed;
    },

    async set(key: string, value: Store.StoreValue): Promise<void> {
      // Sheets cells hold structured JSON only. A binary leaf anywhere in the
      // value (e.g. a request-cache encoded Buffer) would JSON.stringify into a
      // base64 blob, and the 50k-character cell limit makes that unsafe. Reject
      // any binary leaf, at any depth, loudly. Plain JSON values are unaffected.
      if (hasBinaryLeaf(value)) {
        throw new StepError(
          'Sheets store cannot persist binary values (Uint8Array). Cells hold structured JSON only; the 50k-character cell limit makes base64 binary unsafe. Use fs, s3, or gcs.',
          { code: 'config' },
        );
      }
      const serialized = JSON.stringify(value);
      const keyToRow = await keyIndex();
      const existingRow = keyToRow.get(key);
      if (existingRow === undefined) {
        const newRow = await appendRow(
          settings.id,
          sheet,
          keyCol,
          valueCol,
          [key, serialized],
          getToken,
          doFetch,
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
          doFetch,
        );
      }
    },

    async delete(key: string): Promise<void> {
      const row = (await keyIndex()).get(key);
      if (row === undefined) return;
      await writeCell(settings.id, sheet, valueCol, row, '', getToken, doFetch);
    },
  };
};
