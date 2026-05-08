jest.mock('../auth', () => ({
  createTokenProvider: jest.fn(() => jest.fn().mockResolvedValue('mock-token')),
}));

import { createMockLogger } from '@walkeros/core';
import type { SheetsStoreSettings } from '../types';
import { setup, type SheetsStoreConfig } from '../setup';

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

const baseSettings: SheetsStoreSettings = {
  id: 'spreadsheet-id-123',
};

function createConfig(
  overrides: Partial<SheetsStoreConfig> = {},
): SheetsStoreConfig {
  return {
    settings: baseSettings,
    setup: true,
    ...overrides,
  };
}

function createCtx(config: SheetsStoreConfig) {
  return {
    id: 'crm',
    config,
    env: {},
    logger: createMockLogger(),
  };
}

describe('setup (Sheets spreadsheet)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies the spreadsheet exists when no headers are configured', async () => {
    const { calls, restore } = installFetch([{ status: 200 }]);
    try {
      const ctx = createCtx(createConfig());
      const result = await setup(ctx);

      expect(result).toEqual({ headersWritten: false });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(
        'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123?fields=spreadsheetId',
      );
      const headers = calls[0].init?.headers;
      expect(headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      );
    } finally {
      restore();
    }
  });

  it('writes the header row when headers are configured', async () => {
    const { calls, restore } = installFetch([{ status: 200 }, { status: 200 }]);
    try {
      const ctx = createCtx(
        createConfig({ setup: { headers: ['hashed_email', 'value'] } }),
      );
      const result = await setup(ctx);

      expect(result).toEqual({ headersWritten: true });
      expect(calls).toHaveLength(2);
      expect(calls[1].url).toBe(
        'https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-id-123/values/Sheet1!A1%3AB1?valueInputOption=RAW',
      );
      expect(calls[1].init?.method).toBe('PUT');
      const headers = calls[1].init?.headers;
      expect(headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        }),
      );
      const rawBody = calls[1].init?.body;
      expect(typeof rawBody).toBe('string');
      const body: unknown = JSON.parse(
        typeof rawBody === 'string' ? rawBody : '{}',
      );
      expect(body).toEqual(
        expect.objectContaining({
          values: [['hashed_email', 'value']],
          range: 'Sheet1!A1:B1',
        }),
      );
    } finally {
      restore();
    }
  });

  it('throws an actionable error when the spreadsheet is missing (404)', async () => {
    const { restore } = installFetch([
      { status: 404, text: async () => 'Not Found' },
    ]);
    try {
      const ctx = createCtx(createConfig());
      await expect(setup(ctx)).rejects.toThrow(
        /Spreadsheet not found.*walkeros setup store\.crm/,
      );
    } finally {
      restore();
    }
  });

  it('returns undefined and never calls fetch when config.setup === false', async () => {
    const { calls, restore } = installFetch([]);
    try {
      const ctx = createCtx(createConfig({ setup: false }));
      const result = await setup(ctx);

      expect(result).toBeUndefined();
      expect(calls).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it('returns undefined and never calls fetch when config.setup is missing', async () => {
    const { calls, restore } = installFetch([]);
    try {
      const config: SheetsStoreConfig = { settings: baseSettings };
      const ctx = createCtx(config);
      const result = await setup(ctx);

      expect(result).toBeUndefined();
      expect(calls).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it('encodes sheet names with spaces in the header write URL', async () => {
    const { calls, restore } = installFetch([{ status: 200 }, { status: 200 }]);
    try {
      const ctx = createCtx(
        createConfig({
          settings: { ...baseSettings, sheet: 'My Sheet' },
          setup: { headers: ['a', 'b'] },
        }),
      );
      await setup(ctx);

      expect(calls).toHaveLength(2);
      expect(calls[1].url).toContain(encodeURIComponent("'My Sheet'!A1:B1"));
    } finally {
      restore();
    }
  });

  it('is idempotent when re-run with the same headers', async () => {
    const { calls, restore } = installFetch([
      { status: 200 },
      { status: 200 },
      { status: 200 },
      { status: 200 },
    ]);
    try {
      const ctx = createCtx(createConfig({ setup: { headers: ['a', 'b'] } }));
      const first = await setup(ctx);
      const second = await setup(ctx);

      expect(first).toEqual({ headersWritten: true });
      expect(second).toEqual({ headersWritten: true });
      expect(calls).toHaveLength(4);
      expect(ctx.logger.warn).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('throws when settings.id is empty', async () => {
    const { calls, restore } = installFetch([]);
    try {
      const config: SheetsStoreConfig = {
        settings: { id: '' },
        setup: true,
      };
      const ctx = createCtx(config);
      await expect(setup(ctx)).rejects.toThrow(
        /settings\.id.*spreadsheet ID.*required/,
      );
      expect(calls).toHaveLength(0);
    } finally {
      restore();
    }
  });
});
