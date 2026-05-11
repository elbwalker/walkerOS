import type { SheetsStoreSettings } from './types';

export const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export function resolveSheet(settings: SheetsStoreSettings): string {
  return settings.sheet ?? 'Sheet1';
}

export function resolveKeyColumn(settings: SheetsStoreSettings): string {
  return (settings.key ?? 'A').toUpperCase();
}

export function resolveValueColumn(settings: SheetsStoreSettings): string {
  return (settings.value ?? 'B').toUpperCase();
}

export function resolveHeaderRows(settings: SheetsStoreSettings): number {
  return settings.headerRows ?? 1;
}

/** Build an A1 range like 'Sheet1!A2:A' for reading a whole column from row N. */
export function buildColumnRange(
  sheet: string,
  column: string,
  fromRow: number,
): string {
  return `${encodeSheet(sheet)}!${column}${fromRow}:${column}`;
}

/** Build an A1 range like 'Sheet1!B5' for a single cell. */
export function buildCellRange(
  sheet: string,
  column: string,
  row: number,
): string {
  return `${encodeSheet(sheet)}!${column}${row}`;
}

/** Build an A1 range for writing the header row. */
export function buildHeaderRange(sheet: string, columnsCount: number): string {
  const last = columnLetter(columnsCount);
  return `${encodeSheet(sheet)}!A1:${last}1`;
}

/** Build an A1 range for appending rows across the key+value columns. */
export function buildAppendRange(
  sheet: string,
  keyColumn: string,
  valueColumn: string,
): string {
  return `${encodeSheet(sheet)}!${keyColumn}:${valueColumn}`;
}

/** Convert a 1-based column index into a column letter (1 -> A, 27 -> AA). */
export function columnLetter(index: number): string {
  if (index < 1) {
    throw new Error(`columnLetter: index must be >=1, got ${index}`);
  }
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Sheet names with spaces or special chars must be wrapped in single quotes. */
export function encodeSheet(name: string): string {
  if (/^[A-Za-z0-9_]+$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

/**
 * Parse a row index out of a Sheets API `updates.updatedRange` value such as
 * `Sheet1!A5:B5` or `'My Sheet'!A5:B5`. Returns the first row number found.
 */
export function parseRowFromRange(range: string): number | undefined {
  const match = /![A-Z]+(\d+)/.exec(range);
  if (!match) return undefined;
  const row = Number.parseInt(match[1], 10);
  return Number.isFinite(row) ? row : undefined;
}
