// Test-only stateful harness for the subset of @aws-sdk/client-sns the SQS
// source uses (only SubscribeCommand). Mirrors the SNS destination plan's
// shape but trimmed to the smallest surface needed here.

const calls = jest.fn();

interface SnsHarness {
  subscriptions: Map<string, string>; // key: `${TopicArn}::${Endpoint}` -> SubscriptionArn
  subscribeError?: Error;
}

const harness: SnsHarness = { subscriptions: new Map() };

export function __resetSnsMockCalls(): void {
  harness.subscriptions = new Map();
  harness.subscribeError = undefined;
  calls.mockClear();
}

export function __setSubscribeError(err: Error | undefined): void {
  harness.subscribeError = err;
}

export interface SnsCall {
  method: string;
  input: unknown;
}

export function __getSnsMockCalls(): SnsCall[] {
  const records: SnsCall[] = [];
  for (const c of calls.mock.calls) {
    const [method, input] = c;
    if (typeof method !== 'string') continue;
    records.push({ method, input });
  }
  return records;
}

interface SubscribeInput {
  TopicArn: string;
  Protocol: string;
  Endpoint: string;
  Attributes?: Record<string, string>;
  ReturnSubscriptionArn?: boolean;
}

class CommandBase<I = unknown> {
  input: I;
  constructor(input: I) {
    this.input = input;
  }
}

export class SubscribeCommand extends CommandBase<SubscribeInput> {}

function isSubscribeInput(value: unknown): value is SubscribeInput {
  if (typeof value !== 'object' || value === null) return false;
  const obj: {
    TopicArn?: unknown;
    Protocol?: unknown;
    Endpoint?: unknown;
  } = value;
  return (
    typeof obj.TopicArn === 'string' &&
    typeof obj.Protocol === 'string' &&
    typeof obj.Endpoint === 'string'
  );
}

interface CommandLike {
  input: unknown;
  constructor: { name: string };
}

export class SNSClient {
  config: unknown;
  constructor(config?: unknown) {
    this.config = config;
    calls('SNSClient.ctor', config);
  }
  async send(command: CommandLike): Promise<unknown> {
    const name = command.constructor.name;
    calls(name, command.input);
    if (name === 'SubscribeCommand') {
      if (harness.subscribeError) {
        const err = harness.subscribeError;
        harness.subscribeError = undefined;
        throw err;
      }
      if (!isSubscribeInput(command.input)) {
        throw new Error('SNSClient mock: SubscribeCommand input invalid');
      }
      const key = `${command.input.TopicArn}::${command.input.Endpoint}`;
      const arn =
        harness.subscriptions.get(key) ??
        `${command.input.TopicArn}:sub-${harness.subscriptions.size + 1}`;
      harness.subscriptions.set(key, arn);
      return { SubscriptionArn: arn };
    }
    throw new Error(`SNSClient mock: unsupported command ${name}`);
  }
  destroy(): void {
    calls('SNSClient.destroy', undefined);
  }
}
