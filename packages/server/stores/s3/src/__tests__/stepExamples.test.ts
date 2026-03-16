import type { Collector, Logger } from '@walkeros/core';
import { storeS3Init } from '../store';
import { examples } from '../dev';

const mockGetObjectArrayBuffer = jest.fn();
const mockPutObject = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock('s3mini', () => {
  return {
    S3mini: jest.fn().mockImplementation(() => ({
      getObjectArrayBuffer: mockGetObjectArrayBuffer,
      putObject: mockPutObject,
      deleteObject: mockDeleteObject,
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
    },
    env: {},
  };
}

async function createStore(settings: Record<string, unknown> = {}) {
  return await storeS3Init(createContext(settings));
}

describe('Step Examples', () => {
  beforeEach(() => {
    mockGetObjectArrayBuffer.mockReset();
    mockPutObject.mockReset();
    mockDeleteObject.mockReset();
    jest.clearAllMocks();
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
    const output = example.out as { s3Path: string };

    const content = Buffer.from('data');
    mockGetObjectArrayBuffer.mockResolvedValue(content.buffer);

    const store = await createStore({
      bucket: input.settings.bucket,
      prefix: input.settings.prefix,
    });
    await store.get(input.key);

    expect(mockGetObjectArrayBuffer).toHaveBeenCalledWith(output.s3Path);
  });
});
