jest.mock('node:crypto', () => ({
  createSign: jest.fn(() => ({
    update: jest.fn(),
    sign: jest.fn(() => 'mock-signature'),
  })),
}));

import { createTokenProvider } from '../auth';

interface FetchResponseShape {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}

interface FetchCall {
  url: string;
  init?: RequestInit;
}

type FetchInput = Parameters<typeof fetch>[0];

function urlToString(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function makeResponse(shape: FetchResponseShape): Response {
  const init: ResponseInit = { status: shape.status ?? (shape.ok ? 200 : 500) };
  const response = new Response(shape.json ? '{}' : '', init);
  Object.defineProperty(response, 'ok', { value: shape.ok });
  if (shape.json) {
    Object.defineProperty(response, 'json', { value: shape.json });
  }
  return response;
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
      calls.push({ url: urlToString(input), init });
      const next = responses[i++];
      if (!next) {
        throw new Error(`unexpected fetch call #${i}`);
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

describe('createTokenProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ADC mode (no credentials)', () => {
    it('should fetch token from metadata server', async () => {
      const { calls, restore } = installFetch([
        {
          ok: true,
          json: async () => ({ access_token: 'adc-token', expires_in: 3600 }),
        },
      ]);
      try {
        const getToken = createTokenProvider();
        const token = await getToken();

        expect(token).toBe('adc-token');
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe(
          'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        );
        expect(calls[0].init?.headers).toEqual({
          'Metadata-Flavor': 'Google',
        });
      } finally {
        restore();
      }
    });

    it('should cache token on subsequent calls', async () => {
      const { calls, restore } = installFetch([
        {
          ok: true,
          json: async () => ({
            access_token: 'cached-token',
            expires_in: 3600,
          }),
        },
      ]);
      try {
        const getToken = createTokenProvider();
        await getToken();
        const token = await getToken();

        expect(token).toBe('cached-token');
        expect(calls).toHaveLength(1);
      } finally {
        restore();
      }
    });

    it('should throw on metadata server error', async () => {
      const { restore } = installFetch([{ ok: false, status: 404 }]);
      try {
        const getToken = createTokenProvider();
        await expect(getToken()).rejects.toThrow('Metadata server error: 404');
      } finally {
        restore();
      }
    });
  });

  describe('SA mode (with credentials)', () => {
    const creds = {
      client_email: 'test@project.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
    };

    it('should exchange JWT for access token', async () => {
      const { calls, restore } = installFetch([
        {
          ok: true,
          json: async () => ({ access_token: 'sa-token', expires_in: 3600 }),
        },
      ]);
      try {
        const getToken = createTokenProvider(creds);
        const token = await getToken();

        expect(token).toBe('sa-token');
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe('https://oauth2.googleapis.com/token');
        expect(calls[0].init?.method).toBe('POST');
        expect(calls[0].init?.headers).toEqual({
          'Content-Type': 'application/x-www-form-urlencoded',
        });
      } finally {
        restore();
      }
    });

    it('should request the spreadsheets OAuth scope', async () => {
      const { calls, restore } = installFetch([
        {
          ok: true,
          json: async () => ({ access_token: 'sa-token', expires_in: 3600 }),
        },
      ]);
      try {
        const getToken = createTokenProvider(creds);
        await getToken();

        const body = calls[0].init?.body;
        expect(typeof body).toBe('string');
        const bodyStr = typeof body === 'string' ? body : '';
        const match = /assertion=([^&]+)/.exec(bodyStr);
        expect(match).not.toBeNull();
        const jwt = match ? match[1] : '';
        const parts = jwt.split('.');
        expect(parts).toHaveLength(3);
        const payloadJson = Buffer.from(parts[1], 'base64url').toString();
        const payload: unknown = JSON.parse(payloadJson);
        expect(payload).toEqual(
          expect.objectContaining({
            iss: creds.client_email,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
          }),
        );
      } finally {
        restore();
      }
    });

    it('should cache SA token on subsequent calls', async () => {
      const { calls, restore } = installFetch([
        {
          ok: true,
          json: async () => ({ access_token: 'sa-cached', expires_in: 3600 }),
        },
      ]);
      try {
        const getToken = createTokenProvider(creds);
        await getToken();
        const token = await getToken();

        expect(token).toBe('sa-cached');
        expect(calls).toHaveLength(1);
      } finally {
        restore();
      }
    });

    it('should throw on token exchange error', async () => {
      const { restore } = installFetch([{ ok: false, status: 401 }]);
      try {
        const getToken = createTokenProvider(creds);
        await expect(getToken()).rejects.toThrow('Token exchange error: 401');
      } finally {
        restore();
      }
    });
  });
});
