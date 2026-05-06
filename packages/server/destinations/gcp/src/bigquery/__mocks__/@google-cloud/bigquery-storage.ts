const calls: Array<{ method: string; args: unknown[] }> = [];

interface MockRowError {
  index: number;
  code: number;
  message: string;
}

let nextAppendRowErrors: MockRowError[] | null = null;

class MockJSONWriter {
  constructor(_args: { connection: unknown; protoDescriptor: unknown }) {
    calls.push({ method: 'JSONWriter.ctor', args: [_args] });
  }
  appendRows(rows: unknown[], offsetValue?: unknown) {
    calls.push({ method: 'appendRows', args: [rows, offsetValue] });
    const queuedErrors = nextAppendRowErrors;
    nextAppendRowErrors = null;
    return {
      getResult: async () => ({
        appendResult: { offset: { value: '0' } },
        rowErrors: queuedErrors ?? [],
        writeStream: 'projects/p/datasets/d/tables/t/streams/_default',
      }),
    };
  }
  close(): void {
    calls.push({ method: 'JSONWriter.close', args: [] });
  }
}

class MockWriterClient {
  constructor(args: { projectId?: string }) {
    calls.push({ method: 'WriterClient.ctor', args: [args] });
  }
  async createStreamConnection(args: {
    destinationTable: string;
    streamType: string;
  }) {
    calls.push({ method: 'createStreamConnection', args: [args] });
    return {
      getStreamId: () => `${args.destinationTable}/streams/_default`,
    };
  }
  async getWriteStream(args: { streamId: string; view?: number }) {
    calls.push({ method: 'getWriteStream', args: [args] });
    // Minimal tableSchema shape consumed by adapt.convertStorageSchemaToProto2Descriptor
    return {
      tableSchema: { fields: [] },
    };
  }
  close(): void {
    calls.push({ method: 'WriterClient.close', args: [] });
  }
}

const adapt = {
  convertStorageSchemaToProto2Descriptor: (_schema: unknown, _root: string) => {
    calls.push({
      method: 'adapt.convertStorageSchemaToProto2Descriptor',
      args: [_schema, _root],
    });
    return { name: 'root', field: [] };
  },
};

const managedwriter = {
  WriterClient: MockWriterClient,
  JSONWriter: MockJSONWriter,
  DefaultStream: 'DEFAULT',
};

const protos = {
  google: {
    cloud: {
      bigquery: {
        storage: {
          v1: {
            WriteStreamView: {
              WRITE_STREAM_VIEW_UNSPECIFIED: 0,
              BASIC: 1,
              FULL: 2,
            },
          },
        },
      },
    },
  },
};

// Test-only helper. Not part of the real SDK.
function __getMockCalls() {
  return calls;
}

function __resetMockCalls() {
  calls.length = 0;
  nextAppendRowErrors = null;
}

/**
 * Test-only: queue rowErrors for the next appendRows().getResult() call.
 * Auto-resets after one use.
 */
function __setNextAppendRowErrors(errors: MockRowError[]): void {
  nextAppendRowErrors = errors;
}

export {
  managedwriter,
  adapt,
  protos,
  __getMockCalls,
  __resetMockCalls,
  __setNextAppendRowErrors,
};
