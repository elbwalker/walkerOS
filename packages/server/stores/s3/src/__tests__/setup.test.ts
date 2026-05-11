import { createMockLogger } from '@walkeros/core';
import type { Store } from '@walkeros/core';
import type { Types } from '../types';

const mockBucketExists = jest.fn();
const mockCreateBucket = jest.fn();

jest.mock('s3mini', () => ({
  S3mini: jest.fn().mockImplementation(() => ({
    bucketExists: mockBucketExists,
    createBucket: mockCreateBucket,
  })),
}));

// Read the hoisted S3mini constructor mock back via a typed accessor.
// Using `jest.requireMock` returns the ESM-shaped module; we narrow with a
// runtime guard so no `as` cast is needed.
import * as s3miniModule from 's3mini';

function getS3miniCtor(): jest.Mock {
  const value = s3miniModule.S3mini;
  if (!isJestMock(value)) {
    throw new Error('test setup error: s3mini.S3mini is not a jest mock');
  }
  return value;
}

function isJestMock(value: unknown): value is jest.Mock {
  return (
    typeof value === 'function' &&
    Object.prototype.hasOwnProperty.call(value, 'mock')
  );
}

const mockS3miniCtor = getS3miniCtor();

import { setup, DEFAULT_SETUP, type S3StoreConfig } from '../setup';

const baseSettings = {
  bucket: 'my-bucket',
  endpoint: 'https://s3.eu-central-1.amazonaws.com',
  accessKeyId: 'AKID',
  secretAccessKey: 'secret',
};

function createConfig(overrides: Partial<S3StoreConfig> = {}): S3StoreConfig {
  return {
    settings: baseSettings,
    setup: true,
    ...overrides,
  };
}

function createCtx(config: S3StoreConfig) {
  return {
    id: 's3',
    config,
    env: {} as Store.BaseEnv,
    logger: createMockLogger(),
  };
}

describe('s3 setup', () => {
  beforeEach(() => {
    mockBucketExists.mockReset();
    mockCreateBucket.mockReset();
    jest.clearAllMocks();
  });

  it('exposes DEFAULT_SETUP with eu-central-1 region', () => {
    expect(DEFAULT_SETUP).toEqual({ region: 'eu-central-1' });
  });

  it('creates bucket when missing (happy path)', async () => {
    mockBucketExists.mockResolvedValue(false);
    mockCreateBucket.mockResolvedValue(true);

    const ctx = createCtx(createConfig());
    const result = await setup(ctx);

    expect(result).toEqual({ bucketCreated: true });
    expect(mockBucketExists).toHaveBeenCalledTimes(1);
    expect(mockCreateBucket).toHaveBeenCalledTimes(1);
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });

  it('is idempotent when bucket exists (no create call)', async () => {
    mockBucketExists.mockResolvedValue(true);

    const ctx = createCtx(createConfig());
    const result = await setup(ctx);

    expect(result).toEqual({ bucketCreated: false });
    expect(mockBucketExists).toHaveBeenCalledTimes(1);
    expect(mockCreateBucket).not.toHaveBeenCalled();
  });

  it('treats BucketAlreadyOwnedByYou (race) as success', async () => {
    mockBucketExists.mockResolvedValue(false);
    const err = Object.assign(new Error('owned'), {
      code: 'BucketAlreadyOwnedByYou',
    });
    mockCreateBucket.mockRejectedValue(err);

    const ctx = createCtx(createConfig());
    const result = await setup(ctx);

    expect(result).toEqual({ bucketCreated: false });
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });

  it('fails loud on BucketAlreadyExists (different owner)', async () => {
    mockBucketExists.mockResolvedValue(false);
    const err = Object.assign(new Error('exists'), {
      code: 'BucketAlreadyExists',
    });
    mockCreateBucket.mockRejectedValue(err);

    const ctx = createCtx(createConfig());
    await expect(setup(ctx)).rejects.toThrow(/already in use by another/i);
  });

  it('rethrows unexpected createBucket errors', async () => {
    mockBucketExists.mockResolvedValue(false);
    mockCreateBucket.mockRejectedValue(new Error('500 Internal'));

    const ctx = createCtx(createConfig());
    await expect(setup(ctx)).rejects.toThrow(/500 Internal/);
  });

  it('returns undefined when config.setup === false', async () => {
    const ctx = createCtx(createConfig({ setup: false }));
    const result = await setup(ctx);

    expect(result).toBeUndefined();
    expect(mockBucketExists).not.toHaveBeenCalled();
    expect(mockCreateBucket).not.toHaveBeenCalled();
  });

  it('returns undefined when config.setup is missing', async () => {
    const config: S3StoreConfig = { settings: baseSettings };
    const ctx = createCtx(config);
    const result = await setup(ctx);

    expect(result).toBeUndefined();
    expect(mockBucketExists).not.toHaveBeenCalled();
  });

  it('throws actionable error when settings.bucket is empty', async () => {
    const config: S3StoreConfig = {
      settings: { ...baseSettings, bucket: '' },
      setup: true,
    };
    const ctx = createCtx(config);
    await expect(setup(ctx)).rejects.toThrow(/settings\.bucket.*required/i);
  });

  it('uses settings.region for setup when concrete', async () => {
    mockS3miniCtor.mockClear();
    mockBucketExists.mockResolvedValue(true);

    const config: S3StoreConfig = {
      settings: { ...baseSettings, region: 'eu-west-3' },
      setup: true,
    };
    const ctx = createCtx(config);
    await setup(ctx);

    expect(mockS3miniCtor).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'eu-west-3' }),
    );
  });

  it('falls back to eu-central-1 when settings.region is "auto"', async () => {
    mockS3miniCtor.mockClear();
    mockBucketExists.mockResolvedValue(true);

    const config: S3StoreConfig = {
      settings: { ...baseSettings, region: 'auto' },
      setup: true,
    };
    const ctx = createCtx(config);
    await setup(ctx);

    expect(mockS3miniCtor).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'eu-central-1' }),
    );
  });

  it('honors explicit setup.region over settings.region', async () => {
    mockS3miniCtor.mockClear();
    mockBucketExists.mockResolvedValue(true);

    const config: S3StoreConfig = {
      settings: { ...baseSettings, region: 'eu-central-1' },
      setup: { region: 'us-east-1' },
    };
    const ctx = createCtx(config);
    await setup(ctx);

    expect(mockS3miniCtor).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'us-east-1' }),
    );
  });
});

// Compile-time guard: Types is exported correctly so MCP can read schemas.
const _types: Types | undefined = undefined;
void _types;
