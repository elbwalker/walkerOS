declare module 'kafkajs' {
  export function __setKafkaSetupHarness(
    patch: Partial<{
      topicExists: boolean;
      partitionCount: number;
      replicationFactor: number;
      configEntries: Array<{ configName: string; configValue: string }>;
      createTopicsError: { type: string; code: number; message?: string };
      postErrorTopicExists: boolean;
    }>,
  ): void;
  export function __resetKafkaSetupHarness(): void;
  export function __getAdminCalls(): ReadonlyArray<{
    method: string;
    args: Record<string, unknown>;
  }>;
}

export {};
