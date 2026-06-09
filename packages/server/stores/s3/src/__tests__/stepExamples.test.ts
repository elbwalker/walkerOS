import type { Collector, Logger } from '@walkeros/core';
import { storeS3Init } from '../store';
import { examples } from '../dev';

const mockGetObjectArrayBuffer = jest.fn();
const mockPutObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockBucketExists = jest.fn();
const mockCreateBucket = jest.fn();

jest.mock('s3mini', () => {
  return {
    S3mini: jest.fn().mockImplementation(() => ({
      getObjectArrayBuffer: mockGetObjectArrayBuffer,
      putObject: mockPutObject,
      deleteObject: mockDeleteObject,
      bucketExists: mockBucketExists,
      createBucket: mockCreateBucket,
    })),
  };
});

const mockLogger: Logger.Instance = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  throw: jest.fn() as unknown as Logger.ThrowFn,
  json: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

// The s3 step examples document the byte-serving use case (reading a
// walker.js asset back as a Buffer), which is file mode.
function createContext(settings: Record<string, unknown> = {}) {
  return {
    collector: {} as Collector.Instance,
    logger: mockLogger,
    id: 'test-s3',
    config: {
      settings: {
        bucket: 'my-bucket',
        endpoint: 'https://s3.us-east-1.amazonaws.com',
        accessKeyId: 'AKID',
        secretAccessKey: 'secret',
        ...settings,
      },
      file: true,
    },
    env: {},
  };
}

async function createStore(settings: Record<string, unknown> = {}) {
  return await storeS3Init(createContext(settings));
}

describe('Step Examples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetObjectArrayBuffer.mockReset();
    mockPutObject.mockReset();
    mockDeleteObject.mockReset();
    mockBucketExists.mockReset();
    mockCreateBucket.mockReset();
    // Default to bucket existing so step examples are unaffected by the
    // new init-time bucket-exists guard.
    mockBucketExists.mockResolvedValue(true);
  });

  it('readAwsS3 — read object from S3 bucket', async () => {
    const example = examples.step.readAwsS3;
    const input = example.in as { operation: string; key: string };

    const content = Buffer.from('(function(){...})()');
    mockGetObjectArrayBuffer.mockResolvedValue(
      content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      ),
    );

    const store = await createStore();
    const result = await store.get(input.key);

    expect(result).toBeInstanceOf(Buffer);
    expect(mockGetObjectArrayBuffer).toHaveBeenCalledWith(input.key);
  });

  it('prefixScoping — key is scoped under configured prefix', async () => {
    const example = examples.step.prefixScoping;
    const input = example.in as {
      operation: string;
      key: string;
      settings: { bucket: string; prefix: string };
    };
    const [, s3Path] = example.out![0] as readonly [string, string, unknown];

    const content = Buffer.from('data');
    mockGetObjectArrayBuffer.mockResolvedValue(content.buffer);

    const store = await createStore({
      bucket: input.settings.bucket,
      prefix: input.settings.prefix,
    });
    await store.get(input.key);

    expect(mockGetObjectArrayBuffer).toHaveBeenCalledWith(s3Path);
  });
});
