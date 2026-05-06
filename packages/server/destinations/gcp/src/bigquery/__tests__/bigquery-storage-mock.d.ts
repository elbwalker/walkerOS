declare module '@google-cloud/bigquery-storage' {
  export function __getMockCalls(): Array<{ method: string; args: unknown[] }>;
  export function __resetMockCalls(): void;
  export function __setNextAppendRowErrors(
    errors: Array<{ index: number; code: number; message: string }>,
  ): void;
}

export {};
