import type { Env } from '../types';

/**
 * Mock env for the Sheets store: an in-memory spreadsheet behind `fetch`.
 *
 * It answers every request the store makes, at start and per operation: the
 * token exchange (service account) or metadata token (ADC), the spreadsheet
 * existence check, the key column read, cell reads, appends and cell writes.
 * Values live in a `Map` per cell, so a `get` after a `set` returns what was
 * written. One sheet is modelled; the spreadsheet id and sheet name are not
 * checked. Row 1 is the header row, row 2 holds the seeded `alice` entry.
 */

const TOKEN_BODY = { access_token: 'mock-access-token', expires_in: 3600 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function firstCell(body: unknown): string[] {
  if (typeof body !== 'string') return [];
  const parsed: unknown = JSON.parse(body);
  if (typeof parsed !== 'object' || parsed === null) return [];
  const values: unknown = Reflect.get(parsed, 'values');
  if (!Array.isArray(values) || !Array.isArray(values[0])) return [];
  return values[0].map((cell: unknown) => String(cell));
}

/** Create a fresh in-memory Sheets backend, seeded with `rows` from row 2. */
export function createSheetsFetch(
  rows: Array<[string, string]> = [['alice', '{"tier":"gold"}']],
): typeof fetch {
  const cells = new Map<string, string>([
    ['A1', 'key'],
    ['B1', 'value'],
  ]);
  rows.forEach(([key, value], i) => {
    cells.set(`A${i + 2}`, key);
    cells.set(`B${i + 2}`, value);
  });

  const lastRow = (): number => {
    let max = 0;
    for (const ref of cells.keys()) {
      const row = Number.parseInt(ref.replace(/^[A-Z]+/, ''), 10);
      if (row > max) max = row;
    }
    return max;
  };

  return async (input, init) => {
    const url = requestUrl(input);
    const method = init?.method ?? 'GET';

    if (url.startsWith('https://oauth2.googleapis.com/token'))
      return jsonResponse(TOKEN_BODY);
    if (url.startsWith('http://metadata.google.internal/'))
      return jsonResponse(TOKEN_BODY);

    const values = /\/spreadsheets\/([^/?]+)\/values\/([^?]+)/.exec(url);
    if (!values) {
      const sheet = /\/spreadsheets\/([^/?]+)\?/.exec(url);
      if (sheet) return jsonResponse({ spreadsheetId: sheet[1] });
      return jsonResponse({ error: { code: 404 } }, 404);
    }

    const range = decodeURIComponent(values[2]);

    // Append across the key and value columns, e.g. `Sheet1!A:B:append`.
    const append = /!([A-Z]+):([A-Z]+):append$/.exec(range);
    if (append && method === 'POST') {
      const row = lastRow() + 1;
      const [key = '', value = ''] = firstCell(init?.body);
      cells.set(`${append[1]}${row}`, key);
      cells.set(`${append[2]}${row}`, value);
      return jsonResponse({
        updates: {
          updatedRange: `Sheet1!${append[1]}${row}:${append[2]}${row}`,
        },
      });
    }

    // Whole column from a row, e.g. `Sheet1!A2:A`.
    const column = /!([A-Z]+)(\d+):([A-Z]+)$/.exec(range);
    if (column) {
      const out: string[][] = [];
      for (let row = Number(column[2]); row <= lastRow(); row++) {
        out.push([cells.get(`${column[1]}${row}`) ?? '']);
      }
      return jsonResponse({ range, values: out });
    }

    // Single cell, e.g. `Sheet1!B5`.
    const cell = /!([A-Z]+\d+)$/.exec(range);
    if (cell) {
      if (method === 'PUT') {
        cells.set(cell[1], firstCell(init?.body)[0] ?? '');
        return jsonResponse({ updatedRange: range });
      }
      const value = cells.get(cell[1]);
      return jsonResponse(
        value === undefined ? { range } : { range, values: [[value]] },
      );
    }

    return jsonResponse({ error: { code: 400 } }, 400);
  };
}

/** Each read of `fetch` is a fresh backend, so runs never share writes. */
export const push: Env = {
  get fetch() {
    return createSheetsFetch();
  },
};

/** Every request goes through `fetch`; `args[0]` is the URL. */
export const simulation = ['fetch'];
