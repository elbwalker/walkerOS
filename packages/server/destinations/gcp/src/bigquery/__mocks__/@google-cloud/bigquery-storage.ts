import { EventEmitter } from 'events';

const calls: Array<{ method: string; args: unknown[] }> = [];

interface MockRowError {
  index: number;
  code: number;
  message: string;
}

let nextAppendRowErrors: MockRowError[] | null = null;
let nextAppendThrow: unknown = null;
let nextGetResultReject: unknown = null;
let nextCreateStreamConnectionError: unknown = null;

/**
 * Honest stand-in for the SDK's StreamConnection: a REAL Node EventEmitter so
 * `emit('error', …)` with no listener throws exactly like the real one (Node's
 * special-cased `'error'` event). `onConnectionError` mirrors the SDK surface:
 * it registers an `'error'` listener and returns an `{ off }` disposable.
 */
class MockStreamConnection extends EventEmitter {
  private readonly streamId: string;
  constructor(streamId: string) {
    super();
    this.streamId = streamId;
  }
  getStreamId(): string {
    return this.streamId;
  }
  onConnectionError(listener: (err: unknown) => void): { off: () => void } {
    calls.push({ method: 'onConnectionError', args: [] });
    this.on('error', listener);
    return {
      off: () => {
        this.off('error', listener);
      },
    };
  }
  /**
   * Test-only: literally `this.emit('error', err)` with NO internal
   * listener-count guard, so before a listener is attached this reproduces
   * Node's real "throw if no 'error' listener" behavior. A fake that silently
   * swallowed would mask the very crash this listener exists to contain.
   */
  __emitConnectionError(err: unknown): void {
    this.emit('error', err);
  }
}

// The most recently created connection, so tests can emit on it and assert the
// listener was registered.
let lastConnection: MockStreamConnection | null = null;

// Every connection ever created (this reset cycle), so tests can assert that a
// concurrent re-open did not orphan a connection still carrying an 'error'
// listener.
const allConnections: MockStreamConnection[] = [];

class MockJSONWriter {
  constructor(_args: { connection: unknown; protoDescriptor: unknown }) {
    calls.push({ method: 'JSONWriter.ctor', args: [_args] });
  }
  appendRows(rows: unknown[], offsetValue?: unknown) {
    calls.push({ method: 'appendRows', args: [rows, offsetValue] });
    const queuedThrow = nextAppendThrow;
    if (queuedThrow !== null) {
      nextAppendThrow = null;
      throw queuedThrow;
    }
    const queuedErrors = nextAppendRowErrors;
    nextAppendRowErrors = null;
    const queuedReject = nextGetResultReject;
    nextGetResultReject = null;
    return {
      getResult: async () => {
        // Models a gRPC deadline-exceeded (or any stream error): the append is
        // accepted but getResult() rejects when the stream's deadline fires.
        if (queuedReject !== null) throw queuedReject;
        return {
          appendResult: { offset: { value: '0' } },
          rowErrors: queuedErrors ?? [],
          writeStream: 'projects/p/datasets/d/tables/t/streams/_default',
        };
      },
    };
  }
  close(): void {
    calls.push({ method: 'JSONWriter.close', args: [] });
  }
}

class MockWriterClient {
  constructor(args: {
    projectId?: string;
    keyFilename?: string;
    credentials?: unknown;
    scopes?: string | string[];
  }) {
    calls.push({ method: 'WriterClient.ctor', args: [args] });
  }
  async createStreamConnection(
    args: {
      destinationTable: string;
      streamId: string;
    },
    options?: unknown,
  ) {
    // Match the real SDK: callers must pass streamId=DefaultStream (not streamType)
    // for default-stream use. Passing streamType triggers a CreateWriteStream
    // call with type='DEFAULT', which BQ rejects as TYPE_UNSPECIFIED.
    if (args.streamId !== 'DEFAULT') {
      throw new Error(
        `mock createStreamConnection: expected streamId='DEFAULT', got ${JSON.stringify(args)}`,
      );
    }
    // args[1] captures the gax CallOptions (e.g. { timeout }) so tests can
    // assert the request deadline is forwarded to the appendRows stream.
    calls.push({ method: 'createStreamConnection', args: [args, options] });
    const queuedError = nextCreateStreamConnectionError;
    if (queuedError !== null) {
      nextCreateStreamConnectionError = null;
      throw queuedError;
    }
    const connection = new MockStreamConnection(
      `${args.destinationTable}/streams/_default`,
    );
    lastConnection = connection;
    allConnections.push(connection);
    return connection;
  }
  async getWriteStream(
    args: { streamId: string; view?: number },
    options?: unknown,
  ) {
    // args[1] captures the gax CallOptions so tests can assert the deadline
    // is forwarded to the unary schema fetch.
    calls.push({ method: 'getWriteStream', args: [args, options] });
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
  nextAppendThrow = null;
  nextGetResultReject = null;
  nextCreateStreamConnectionError = null;
  lastConnection = null;
  allConnections.length = 0;
}

/**
 * Test-only: the most recently created StreamConnection, so a test can emit an
 * out-of-band `'error'` on it (via `__emitConnectionError`) and assert the
 * destination attached a listener.
 */
function __getLastConnection(): MockStreamConnection {
  if (!lastConnection) throw new Error('mock: no StreamConnection created yet');
  return lastConnection;
}

/**
 * Test-only: every StreamConnection created since the last reset, so a test can
 * assert that a concurrent re-open did not orphan a connection that still
 * carries an 'error' listener (a leak).
 */
function __getAllConnections(): MockStreamConnection[] {
  return allConnections.slice();
}

/**
 * Test-only: queue rowErrors for the next appendRows().getResult() call.
 * Auto-resets after one use.
 */
function __setNextAppendRowErrors(errors: MockRowError[]): void {
  nextAppendRowErrors = errors;
}

/**
 * Test-only: make the next appendRows() throw synchronously, simulating a
 * Storage Write API call failure. Auto-resets after one use.
 */
function __setNextAppendThrow(err: unknown): void {
  nextAppendThrow = err;
}

/**
 * Test-only: make the next appendRows().getResult() reject, simulating a gRPC
 * deadline-exceeded (or any stream error) surfacing through the pending write.
 * Auto-resets after one use.
 */
function __setNextGetResultReject(err: unknown): void {
  nextGetResultReject = err;
}

/**
 * Test-only: queue an error for the next createStreamConnection() call so
 * tests can simulate openWriter failures (NotFound, INVALID_ARGUMENT, etc.).
 * Auto-resets after one use.
 */
function __setNextOpenWriterError(err: unknown): void {
  nextCreateStreamConnectionError = err;
}

export {
  managedwriter,
  adapt,
  protos,
  MockStreamConnection,
  __getMockCalls,
  __resetMockCalls,
  __getLastConnection,
  __getAllConnections,
  __setNextAppendRowErrors,
  __setNextAppendThrow,
  __setNextGetResultReject,
  __setNextOpenWriterError,
};
