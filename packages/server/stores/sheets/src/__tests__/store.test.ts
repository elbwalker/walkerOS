jest.mock('../auth', () => ({
  createTokenProvider: jest.fn(() => jest.fn().mockResolvedValue('mock-token')),
}));

import {
  createMockContext,
  createMockLogger,
  encodeCacheValue,
} from '@walkeros/core';
import type { Store } from '@walkeros/core';
import type { SheetsStoreSettings } from '../types';
import { storeSheetsInit, __resetSpreadsheetExistenceCache } from '../store';

interface FetchCall {
  url: string;
  init?: RequestInit;
}

interface FetchResponseShape {
  status: number;
  ok?: boolean;
  text?: () => Promise<string>;
  json?: () => Promise<unknown>;
}

function makeResponse(shape: FetchResponseShape): Response {
  const ok = shape.ok ?? (shape.status >= 200 && shape.status < 300);
  const init: ResponseInit = { status: shape.status };
  const baseBody = shape.json ? JSON.stringify({}) : '';
  const response = new Response(baseBody, init);
  Object.defineProperty(response, 'ok', { value: ok });
  if (shape.text) {
    Object.defineProperty(response, 'text', { value: shape.text });
  }
  if (shape.json) {
    Object.defineProperty(response, 'json', { value: shape.json });
  }
  return response;
}

type FetchInput = Parameters<typeof fetch>[0];

function urlToString(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function installFetch(responses: FetchResponseShape[]): {
  calls: FetchCall[];
  restore: () => void;
} {
  const calls: FetchCall[] = [];
  let i = 0;
  const spy = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input, init) => {
      const url = urlToString(input);
      calls.push({ url, init });
      const next = responses[i++];
      if (!next) {
        throw new Error(
          `unexpected fetch call #${i}: ${url}; no response programmed`,
        );
      }
      return makeResponse(next);
    });
  return {
    calls,
    restore: () => {
      spy.mockRestore();
    },
  };
}

const mockBase = createMockContext();

function createCtx(overrides: Partial<SheetsStoreSettings> = {}, id = 'crm') {
  const settings: SheetsStoreSettings = {
    id: 'spreadsheet-id-123',
    ...overrides,
  };
  return {
    collector: mockBase.collector,
    logger: createMockLogger(),
    id,
    env: {},
    config: { settings },
  };
}

function probeOk(): FetchResponseShape {
  return { status: 200 };
}

function jsonResponse(value: unknown): FetchResponseShape {
  return { status: 200, json: async () => value };
}

describe('storeSheetsInit', () => {
  beforeEach(() => {
    __resetSpreadsheetExistenceCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('init', () => {
    it('returns a store instance with type "sheets" and reads the key column', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({
          values: [['alice'], ['bob'], ['charlie']],
        }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());

        expect(store.type).toBe('sheets');
        expect(store.get).toBeDefined();
        expect(store.set).toBeDefined();
        expect(store.delete).toBeDefined();
        expect(calls).toHaveLength(2);
        expect(calls[0].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123?fields=spreadsheetId',
        );
        expect(calls[1].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!A2%3AA',
        );
      } finally {
        restore();
      }
    });

    it('hard-fails with an actionable error when the spreadsheet is missing', async () => {
      const { restore } = installFetch([{ status: 404 }]);
      try {
        await expect(storeSheetsInit(createCtx())).rejects.toThrow(
          /Spreadsheet not found.*walkeros setup store\.crm/,
        );
      } finally {
        restore();
      }
    });
  });

  describe('get', () => {
    it('returns parsed JSON for a known key', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice'], ['bob']] }),
        jsonResponse({ values: [['{"tier":"gold"}']] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        const result = await store.get('alice');

        expect(result).toEqual({ tier: 'gold' });
        expect(calls[2].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!B2',
        );
      } finally {
        restore();
      }
    });

    it('returns undefined for an unknown key without calling fetch', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        const initialCallCount = calls.length;

        const result = await store.get('unknown');

        expect(result).toBeUndefined();
        expect(calls).toHaveLength(initialCallCount);
      } finally {
        restore();
      }
    });

    it('returns undefined when the value cell is empty', async () => {
      const { restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
        jsonResponse({ values: [] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        const result = await store.get('alice');
        expect(result).toBeUndefined();
      } finally {
        restore();
      }
    });

    it('returns undefined when JSON parse fails', async () => {
      const { restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
        jsonResponse({ values: [['not json']] }),
      ]);
      try {
        const ctx = createCtx();
        const store = await storeSheetsInit(ctx);
        const result = await store.get('alice');

        expect(result).toBeUndefined();
        expect(ctx.logger.debug).toHaveBeenCalledWith(
          expect.stringMatching(/JSON parse failed/),
          expect.objectContaining({ key: 'alice' }),
        );
      } finally {
        restore();
      }
    });
  });

  describe('set', () => {
    it('appends a new row for a new key and updates the index', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
        jsonResponse({ updates: { updatedRange: 'Sheet1!A5:B5' } }),
        jsonResponse({ values: [['{"tier":"silver"}']] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        await store.set('dave', { tier: 'silver' });

        expect(calls).toHaveLength(3);
        expect(calls[2].url).toContain('/values/');
        expect(calls[2].url).toContain(':append');
        expect(calls[2].init?.method).toBe('POST');
        const rawBody = calls[2].init?.body;
        expect(typeof rawBody).toBe('string');
        const body: unknown = JSON.parse(
          typeof rawBody === 'string' ? rawBody : '{}',
        );
        expect(body).toEqual(
          expect.objectContaining({
            values: [['dave', '{"tier":"silver"}']],
          }),
        );

        const result = await store.get('dave');
        expect(calls).toHaveLength(4);
        expect(calls[3].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!B5',
        );
        expect(result).toEqual({ tier: 'silver' });
      } finally {
        restore();
      }
    });

    it('rejects a Buffer value (request-cache wiring is not supported)', async () => {
      const { restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        const encoded = encodeCacheValue({ status: 200 }, 1000);

        await expect(store.set('req-cache-key', encoded)).rejects.toThrow(
          /Sheets store cannot be used as a request cache/,
        );
      } finally {
        restore();
      }
    });

    it('updates the existing cell for a known key', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice'], ['bob']] }),
        { status: 200 },
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        await store.set('bob', { tier: 'silver' });

        expect(calls).toHaveLength(3);
        expect(calls[2].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!B3?valueInputOption=RAW',
        );
        expect(calls[2].init?.method).toBe('PUT');
        const rawBody = calls[2].init?.body;
        const body: unknown = JSON.parse(
          typeof rawBody === 'string' ? rawBody : '{}',
        );
        expect(body).toEqual(
          expect.objectContaining({
            values: [['{"tier":"silver"}']],
          }),
        );
      } finally {
        restore();
      }
    });
  });

  describe('delete', () => {
    it('blanks the value cell for a known key', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
        { status: 200 },
        jsonResponse({ values: [['']] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        await store.delete('alice');

        expect(calls).toHaveLength(3);
        expect(calls[2].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!B2?valueInputOption=RAW',
        );
        expect(calls[2].init?.method).toBe('PUT');
        const rawBody = calls[2].init?.body;
        const body: unknown = JSON.parse(
          typeof rawBody === 'string' ? rawBody : '{}',
        );
        expect(body).toEqual(expect.objectContaining({ values: [['']] }));

        const result = await store.get('alice');
        expect(result).toBeUndefined();
      } finally {
        restore();
      }
    });

    it('is a no-op for an unknown key', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx());
        const initial = calls.length;

        await store.delete('unknown');

        expect(calls).toHaveLength(initial);
      } finally {
        restore();
      }
    });
  });

  describe('configuration', () => {
    it('honors custom key/value column letters', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['foo']] }),
        jsonResponse({ values: [['{"v":1}']] }),
      ]);
      try {
        const store = await storeSheetsInit(
          createCtx({ key: 'C', value: 'D' }),
        );
        await store.get('foo');

        expect(calls[1].url).toContain(encodeURIComponent('Sheet1!C2:C'));
        expect(calls[2].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!D2',
        );
      } finally {
        restore();
      }
    });

    it('honors custom headerRows', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
        jsonResponse({ values: [['{"v":1}']] }),
      ]);
      try {
        const store = await storeSheetsInit(createCtx({ headerRows: 2 }));
        await store.get('alice');

        expect(calls[1].url).toContain(encodeURIComponent('Sheet1!A3:A'));
        expect(calls[2].url).toBe(
          'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!B3',
        );
      } finally {
        restore();
      }
    });

    it('encodes sheet names with spaces in URLs', async () => {
      const { calls, restore } = installFetch([
        probeOk(),
        jsonResponse({ values: [['alice']] }),
      ]);
      try {
        await storeSheetsInit(createCtx({ sheet: 'My Sheet' }));

        expect(calls[1].url).toContain(encodeURIComponent("'My Sheet'!A2:A"));
      } finally {
        restore();
      }
    });
  });
});

// Re-exported so type imports do not get tree-shaken in dev builds.
export type { Store as _S };
