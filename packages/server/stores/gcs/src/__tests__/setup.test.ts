jest.mock('../auth', () => ({
  createTokenProvider: jest.fn(() => jest.fn().mockResolvedValue('mock-token')),
}));

import { createMockLogger } from '@walkeros/core';
import type { GcsStoreSettings, Setup } from '../types';
import { setup, type GcsStoreConfig } from '../setup';

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
  // Override methods that the test wants to control. We only set
  // properties that exist on Response and assign typed callbacks
  // via Object.defineProperty.
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

const ORIGINAL_ENV = process.env.GOOGLE_CLOUD_PROJECT;

const baseSettings: GcsStoreSettings = {
  bucket: 'my-bucket',
};

const settingsWithProject: GcsStoreSettings = {
  bucket: 'my-bucket',
  credentials: JSON.stringify({
    client_email: 'sa@example.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----',
    project_id: 'my-project',
  }),
};

function createConfig(overrides: Partial<GcsStoreConfig> = {}): GcsStoreConfig {
  return {
    settings: settingsWithProject,
    setup: true,
    ...overrides,
  };
}

function createCtx(config: GcsStoreConfig) {
  return {
    id: 'gcs-store',
    config,
    env: {},
    logger: createMockLogger(),
  };
}

const matchingMetadata = {
  location: 'EU',
  storageClass: 'STANDARD',
  versioning: { enabled: false },
  iamConfiguration: {
    uniformBucketLevelAccess: { enabled: true },
    publicAccessPrevention: 'enforced',
  },
};

describe('setup (GCS bucket)', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    } else {
      process.env.GOOGLE_CLOUD_PROJECT = ORIGINAL_ENV;
    }
  });

  it('creates the bucket when missing (POST 200)', async () => {
    const { calls, restore } = installFetch([{ status: 200 }]);
    try {
      const ctx = createCtx(createConfig());
      const result = await setup(ctx);

      expect(result).toEqual({ bucketCreated: true });
      expect(calls).toHaveLength(1);
      const [call] = calls;
      expect(call.url).toBe(
        'https://storage.googleapis.com/storage/v1/b?project=my-project',
      );
      expect(call.init?.method).toBe('POST');
      const headers = call.init?.headers;
      expect(headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        }),
      );
      const rawBody = call.init?.body;
      expect(typeof rawBody).toBe('string');
      const body: unknown = JSON.parse(
        typeof rawBody === 'string' ? rawBody : '{}',
      );
      expect(body).toEqual({
        name: 'my-bucket',
        location: 'EU',
        storageClass: 'STANDARD',
        versioning: { enabled: false },
        iamConfiguration: {
          uniformBucketLevelAccess: { enabled: true },
          publicAccessPrevention: 'enforced',
        },
      });
    } finally {
      restore();
    }
  });

  it('is idempotent on 409 (bucket already exists, runs drift, no warns when matching)', async () => {
    const { calls, restore } = installFetch([
      { status: 409, text: async () => 'conflict' },
      { status: 200, json: async () => matchingMetadata },
    ]);
    try {
      const ctx = createCtx(createConfig());
      const result = await setup(ctx);

      expect(result).toEqual({ bucketCreated: false });
      expect(calls).toHaveLength(2);
      expect(calls[1].url).toBe(
        'https://storage.googleapis.com/storage/v1/b/my-bucket',
      );
      expect(calls[1].init?.method ?? 'GET').toBe('GET');
      expect(ctx.logger.warn).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('warns on location drift', async () => {
    const drifted = { ...matchingMetadata, location: 'US' };
    const { restore } = installFetch([
      { status: 409 },
      { status: 200, json: async () => drifted },
    ]);
    try {
      const ctx = createCtx(createConfig());
      await setup(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledWith('setup.drift', {
        field: 'location',
        declared: 'EU',
        actual: 'US',
      });
    } finally {
      restore();
    }
  });

  it('warns on storageClass drift', async () => {
    const drifted = { ...matchingMetadata, storageClass: 'NEARLINE' };
    const { restore } = installFetch([
      { status: 409 },
      { status: 200, json: async () => drifted },
    ]);
    try {
      const ctx = createCtx(createConfig());
      await setup(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledWith('setup.drift', {
        field: 'storageClass',
        declared: 'STANDARD',
        actual: 'NEARLINE',
      });
    } finally {
      restore();
    }
  });

  it('warns on versioning drift', async () => {
    const drifted = { ...matchingMetadata, versioning: { enabled: true } };
    const { restore } = installFetch([
      { status: 409 },
      { status: 200, json: async () => drifted },
    ]);
    try {
      const ctx = createCtx(createConfig());
      await setup(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledWith('setup.drift', {
        field: 'versioning',
        declared: false,
        actual: true,
      });
    } finally {
      restore();
    }
  });

  it('warns on publicAccessPrevention drift', async () => {
    const drifted = {
      ...matchingMetadata,
      iamConfiguration: {
        uniformBucketLevelAccess: { enabled: true },
        publicAccessPrevention: 'inherited',
      },
    };
    const { restore } = installFetch([
      { status: 409 },
      { status: 200, json: async () => drifted },
    ]);
    try {
      const ctx = createCtx(createConfig());
      await setup(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledWith('setup.drift', {
        field: 'publicAccessPrevention',
        declared: 'enforced',
        actual: 'inherited',
      });
    } finally {
      restore();
    }
  });

  it('warns on uniformBucketLevelAccess drift', async () => {
    const drifted = {
      ...matchingMetadata,
      iamConfiguration: {
        uniformBucketLevelAccess: { enabled: false },
        publicAccessPrevention: 'enforced',
      },
    };
    const { restore } = installFetch([
      { status: 409 },
      { status: 200, json: async () => drifted },
    ]);
    try {
      const ctx = createCtx(createConfig());
      await setup(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledWith('setup.drift', {
        field: 'uniformBucketLevelAccess',
        declared: true,
        actual: false,
      });
    } finally {
      restore();
    }
  });

  it('warns on labels drift', async () => {
    const declaredLabels: Record<string, string> = { env: 'prod' };
    const actualLabels: Record<string, string> = {
      env: 'dev',
      team: 'data',
    };
    const drifted = { ...matchingMetadata, labels: actualLabels };
    const overrides: Setup = { labels: declaredLabels };
    const { restore } = installFetch([
      { status: 409 },
      { status: 200, json: async () => drifted },
    ]);
    try {
      const ctx = createCtx(createConfig({ setup: overrides }));
      await setup(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
      expect(ctx.logger.warn).toHaveBeenCalledWith('setup.drift', {
        field: 'labels',
        declared: declaredLabels,
        actual: actualLabels,
      });
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

  it('uses defaults when config.setup === true', async () => {
    const { calls, restore } = installFetch([{ status: 200 }]);
    try {
      const ctx = createCtx(createConfig({ setup: true }));
      await setup(ctx);

      expect(calls).toHaveLength(1);
      const rawBody = calls[0].init?.body;
      const body: unknown = JSON.parse(
        typeof rawBody === 'string' ? rawBody : '{}',
      );
      expect(body).toEqual(
        expect.objectContaining({
          location: 'EU',
          storageClass: 'STANDARD',
          versioning: { enabled: false },
        }),
      );
    } finally {
      restore();
    }
  });

  it('throws on non-409 errors with status and body context', async () => {
    const { restore } = installFetch([
      { status: 500, text: async () => 'boom' },
    ]);
    try {
      const ctx = createCtx(createConfig());
      let captured: unknown = undefined;
      try {
        await setup(ctx);
      } catch (err) {
        captured = err;
      }
      expect(captured).toBeInstanceOf(Error);
      const message =
        captured instanceof Error ? captured.message : String(captured);
      expect(message).toContain('500');
      expect(message).toContain('boom');
    } finally {
      restore();
    }
  });

  it('throws when projectId cannot be resolved', async () => {
    const { restore } = installFetch([]);
    try {
      const ctx = createCtx(
        createConfig({
          settings: baseSettings,
          setup: true,
        }),
      );
      await expect(setup(ctx)).rejects.toThrow(
        'setup: projectId is required. Set setup.projectId, provide a service account with project_id, or export GOOGLE_CLOUD_PROJECT.',
      );
    } finally {
      restore();
    }
  });
});
