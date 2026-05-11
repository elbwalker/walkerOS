// __mocks__/kafkajs.ts
//
// Test-only stateful harness emulating the subset of kafkajs the destination
// uses: Kafka constructor, producer factory, admin factory with createTopics,
// fetchTopicMetadata, describeConfigs. Exposes __setKafkaSetupHarness,
// __resetKafkaSetupHarness, __getAdminCalls helpers (typed via the ambient
// declaration in __tests__/kafkajs-mock.d.ts).

interface AdminCall {
  method: string;
  args: Record<string, unknown>;
}

interface HarnessState {
  topicExists: boolean;
  partitionCount: number;
  replicationFactor: number;
  configEntries: Array<{ configName: string; configValue: string }>;
  createTopicsError?: { type: string; code: number; message?: string };
  postErrorTopicExists: boolean;
}

const calls: AdminCall[] = [];

let state: HarnessState = {
  topicExists: false,
  partitionCount: 0,
  replicationFactor: 0,
  configEntries: [],
  postErrorTopicExists: false,
};

export function __setKafkaSetupHarness(patch: Partial<HarnessState>): void {
  state = { ...state, ...patch };
}

export function __resetKafkaSetupHarness(): void {
  calls.length = 0;
  state = {
    topicExists: false,
    partitionCount: 0,
    replicationFactor: 0,
    configEntries: [],
    postErrorTopicExists: false,
  };
}

export function __getAdminCalls(): readonly AdminCall[] {
  return calls;
}

export class TopicAlreadyExistsError extends Error {
  type = 'TopicAlreadyExistsError';
  code = 36;
}

function isResourceRequest(v: unknown): v is { type: number; name: string } {
  if (typeof v !== 'object' || v === null) return false;
  const obj: { type?: unknown; name?: unknown } = v;
  return typeof obj.name === 'string' && typeof obj.type === 'number';
}

function makeAdmin() {
  return {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    createTopics: async (args: Record<string, unknown>) => {
      calls.push({ method: 'createTopics', args });
      if (state.createTopicsError) {
        const err = new TopicAlreadyExistsError(
          state.createTopicsError.message ?? 'topic already exists',
        );
        if (state.postErrorTopicExists) state.topicExists = true;
        throw err;
      }
      state.topicExists = true;
      return true;
    },
    fetchTopicMetadata: async (args: Record<string, unknown>) => {
      calls.push({ method: 'fetchTopicMetadata', args });
      const rawTopics = args.topics;
      const topics: string[] = Array.isArray(rawTopics)
        ? rawTopics.filter((t): t is string => typeof t === 'string')
        : [];
      return {
        topics: topics.map((name) => ({
          name,
          partitions: Array.from({ length: state.partitionCount }, (_, i) => ({
            partitionId: i,
            leader: 0,
            replicas: Array.from(
              { length: state.replicationFactor },
              (_, j) => j,
            ),
            isr: [0],
          })),
        })),
      };
    },
    describeConfigs: async (args: Record<string, unknown>) => {
      calls.push({ method: 'describeConfigs', args });
      const rawResources = args.resources;
      const resources: Array<{ type: number; name: string }> = Array.isArray(
        rawResources,
      )
        ? rawResources.filter(isResourceRequest)
        : [];
      return {
        resources: resources.map((r) => ({
          resourceName: r.name,
          configEntries: state.configEntries,
        })),
      };
    },
  };
}

export class Kafka {
  constructor(_config: unknown) {}
  producer() {
    return {
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
      send: () => Promise.resolve([]),
    };
  }
  admin() {
    return makeAdmin();
  }
}

export const ConfigResourceTypes = {
  UNKNOWN: 0,
  TOPIC: 2,
  BROKER: 4,
  BROKER_LOGGER: 8,
};
