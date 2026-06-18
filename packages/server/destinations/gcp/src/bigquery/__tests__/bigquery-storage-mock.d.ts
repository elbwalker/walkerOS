declare module '@google-cloud/bigquery-storage' {
  import type { EventEmitter } from 'events';
  export class MockStreamConnection extends EventEmitter {
    constructor(streamId: string);
    getStreamId(): string;
    onConnectionError(listener: (err: unknown) => void): { off: () => void };
    __emitConnectionError(err: unknown): void;
  }
  export function __getMockCalls(): Array<{ method: string; args: unknown[] }>;
  export function __resetMockCalls(): void;
  export function __getLastConnection(): MockStreamConnection;
  export function __getAllConnections(): MockStreamConnection[];
  export function __setNextAppendRowErrors(
    errors: Array<{ index: number; code: number; message: string }>,
  ): void;
  export function __setNextAppendThrow(err: unknown): void;
  export function __setNextGetResultReject(err: unknown): void;
  export function __setNextOpenWriterError(err: unknown): void;
}

export {};
