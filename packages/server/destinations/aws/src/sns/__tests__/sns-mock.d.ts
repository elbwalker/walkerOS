// Ambient declarations layered on top of `@aws-sdk/client-sns` and
// `@aws-sdk/client-sts` so test files can import the mock helpers without
// `as any` / `as unknown` casts. The runtime exports come from the
// package-local manual mocks, activated via jest.mock().

declare module '@aws-sdk/client-sns' {
  interface SnsMockTopicState {
    topicArn: string;
    attributes?: Record<string, string>;
    tags?: Record<string, string>;
  }

  interface SnsMockSubscriptionState {
    SubscriptionArn: string;
    Protocol: string;
    Endpoint: string;
    Attributes?: Record<string, string>;
  }

  interface SnsMockHarnessPatch {
    topics?: Record<string, SnsMockTopicState>;
    subscriptions?: Record<string, SnsMockSubscriptionState[]>;
    nextError?: {
      name?: string;
      $metadata?: { httpStatusCode?: number };
      message?: string;
    };
  }

  interface SnsMockCall {
    method: string;
    input: unknown;
  }

  export function __setHarness(patch: SnsMockHarnessPatch): void;
  export function __resetMock(): void;
  export function __getMockCalls(): SnsMockCall[];
}

declare module '@aws-sdk/client-sts' {
  interface StsMockHarnessPatch {
    accountId?: string;
    error?: unknown;
  }

  interface StsMockCall {
    method: string;
    input: unknown;
  }

  export function __setStsHarness(patch: StsMockHarnessPatch): void;
  export function __resetStsMock(): void;
  export function __getStsMockCalls(): StsMockCall[];
}

export {};
