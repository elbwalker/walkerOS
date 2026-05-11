// Ambient declarations so test files can import the mock harness helpers
// from `@aws-sdk/client-sqs` and `@aws-sdk/client-sns` without casts.
//
// The runtime values for these helpers come from the manual mocks in
// `__mocks__/@aws-sdk/client-sqs.ts` and `__mocks__/@aws-sdk/client-sns.ts`,
// activated via `jest.mock('@aws-sdk/client-sqs')` (and -sns) at the top of
// each test file.

declare module '@aws-sdk/client-sqs' {
  export function __resetMockCalls(): void;
  export function __setQueueHarness(
    name: string,
    patch: {
      url?: string;
      arn?: string;
      attributes?: Record<string, string>;
      tags?: Record<string, string>;
    },
  ): void;
  export function __setReceiveMessagesHarness(
    batches: Array<{
      Messages: Array<{
        MessageId: string;
        ReceiptHandle: string;
        Body: string;
        Attributes?: Record<string, string>;
        MessageAttributes?: Record<
          string,
          { DataType: string; StringValue?: string }
        >;
      }>;
    }>,
  ): void;
  export function __setCreateQueueError(err: Error | undefined): void;
  export function __setGetQueueUrlError(err: Error | undefined): void;
  export function __getDeletedReceiptHandles(): string[];
  export function __getMockCalls(): Array<{ method: string; input: unknown }>;
}

declare module '@aws-sdk/client-sns' {
  export function __resetSnsMockCalls(): void;
  export function __setSubscribeError(err: Error | undefined): void;
  export function __getSnsMockCalls(): Array<{
    method: string;
    input: unknown;
  }>;
}

export {};
