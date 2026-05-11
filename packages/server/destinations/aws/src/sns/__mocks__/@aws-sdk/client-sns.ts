// Test-only stateful harness emulating the subset of @aws-sdk/client-sns the
// destination uses: SNSClient with `send`, plus the command classes
// CreateTopicCommand, PublishCommand, GetTopicAttributesCommand, SubscribeCommand.
//
// Exposed harness helpers (typed) let tests program topic state and inspect
// recorded calls without `as any` / `as unknown` casts in test files.

const calls = jest.fn();

interface TopicState {
  topicArn: string;
  attributes?: Record<string, string>;
  tags?: Record<string, string>;
}

interface SubscriptionState {
  SubscriptionArn: string;
  Protocol: string;
  Endpoint: string;
  Attributes?: Record<string, string>;
}

interface AwsErrorShape {
  name?: string;
  $metadata?: { httpStatusCode?: number };
  message?: string;
}

interface Harness {
  topics: Record<string, TopicState>;
  subscriptions: Record<string, SubscriptionState[]>;
  /** Force the next send() to throw with this AWS-shaped error. Reset after consumption. */
  nextError?: AwsErrorShape;
}

const initialHarness = (): Harness => ({
  topics: {},
  subscriptions: {},
  nextError: undefined,
});

let harness: Harness = initialHarness();

export function __setHarness(patch: Partial<Harness>): void {
  if (patch.topics) harness.topics = { ...harness.topics, ...patch.topics };
  if (patch.subscriptions)
    harness.subscriptions = {
      ...harness.subscriptions,
      ...patch.subscriptions,
    };
  if ('nextError' in patch) harness.nextError = patch.nextError;
}

export function __resetMock(): void {
  harness = initialHarness();
  calls.mockClear();
}

export interface MockCall {
  method: string;
  input: unknown;
}

export function __getMockCalls(): MockCall[] {
  const records: MockCall[] = [];
  for (const c of calls.mock.calls) {
    const [method, input] = c;
    if (typeof method !== 'string') continue;
    records.push({ method, input });
  }
  return records;
}

class CommandBase {
  input: unknown;
  constructor(input: unknown) {
    this.input = input;
  }
}

export class CreateTopicCommand extends CommandBase {}
export class PublishCommand extends CommandBase {}
export class GetTopicAttributesCommand extends CommandBase {}
export class SubscribeCommand extends CommandBase {}

interface CreateTopicInput {
  Name?: string;
  Attributes?: Record<string, string>;
  Tags?: Array<{ Key: string; Value: string }>;
}

interface SubscribeInput {
  TopicArn?: string;
  Protocol?: string;
  Endpoint?: string;
  Attributes?: Record<string, string>;
}

interface GetTopicAttributesInput {
  TopicArn?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asCreateTopic(input: unknown): CreateTopicInput {
  if (!isObject(input)) return {};
  const out: CreateTopicInput = {};
  if (typeof input.Name === 'string') out.Name = input.Name;
  if (isObject(input.Attributes)) {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.Attributes)) {
      if (typeof v === 'string') attrs[k] = v;
    }
    out.Attributes = attrs;
  }
  if (Array.isArray(input.Tags)) {
    const tags: Array<{ Key: string; Value: string }> = [];
    for (const t of input.Tags) {
      if (
        isObject(t) &&
        typeof t.Key === 'string' &&
        typeof t.Value === 'string'
      ) {
        tags.push({ Key: t.Key, Value: t.Value });
      }
    }
    out.Tags = tags;
  }
  return out;
}

function asSubscribe(input: unknown): SubscribeInput {
  if (!isObject(input)) return {};
  const out: SubscribeInput = {};
  if (typeof input.TopicArn === 'string') out.TopicArn = input.TopicArn;
  if (typeof input.Protocol === 'string') out.Protocol = input.Protocol;
  if (typeof input.Endpoint === 'string') out.Endpoint = input.Endpoint;
  if (isObject(input.Attributes)) {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.Attributes)) {
      if (typeof v === 'string') attrs[k] = v;
    }
    out.Attributes = attrs;
  }
  return out;
}

function asGetTopicAttributes(input: unknown): GetTopicAttributesInput {
  if (!isObject(input)) return {};
  const out: GetTopicAttributesInput = {};
  if (typeof input.TopicArn === 'string') out.TopicArn = input.TopicArn;
  return out;
}

function dispatch(method: string, input: unknown): unknown {
  switch (method) {
    case 'CreateTopic': {
      const parsed = asCreateTopic(input);
      const name = parsed.Name ?? '';
      // Synthesize an ARN keyed by name. If we already saw a topic with this
      // ARN (any region/account), use it; else build a deterministic stub.
      const existing = Object.values(harness.topics).find((t) =>
        t.topicArn.endsWith(`:${name}`),
      );
      const topicArn =
        existing?.topicArn ?? `arn:aws:sns:eu-central-1:000000000000:${name}`;
      const attrs: Record<string, string> = {
        ...(existing?.attributes ?? {}),
        ...(parsed.Attributes ?? {}),
      };
      const tagMap: Record<string, string> = { ...(existing?.tags ?? {}) };
      if (parsed.Tags) {
        for (const t of parsed.Tags) tagMap[t.Key] = t.Value;
      }
      harness.topics[topicArn] = {
        topicArn,
        attributes: attrs,
        tags: tagMap,
      };
      return { TopicArn: topicArn };
    }
    case 'GetTopicAttributes': {
      const parsed = asGetTopicAttributes(input);
      const arn = parsed.TopicArn ?? '';
      const t = harness.topics[arn];
      if (!t) {
        const err: AwsErrorShape & Error = Object.assign(
          new Error(`Topic does not exist: ${arn}`),
          {
            name: 'NotFoundException',
            $metadata: { httpStatusCode: 404 },
          },
        );
        throw err;
      }
      return { Attributes: t.attributes ?? {} };
    }
    case 'Subscribe': {
      const parsed = asSubscribe(input);
      const arn = parsed.TopicArn ?? '';
      const list = harness.subscriptions[arn] ?? [];
      // Idempotent: same (TopicArn, Protocol, Endpoint) returns the same SubscriptionArn.
      const existing = list.find(
        (s) => s.Protocol === parsed.Protocol && s.Endpoint === parsed.Endpoint,
      );
      if (existing) {
        return { SubscriptionArn: existing.SubscriptionArn };
      }
      const subArn = `${arn}:sub-${list.length + 1}`;
      const next: SubscriptionState = {
        SubscriptionArn: subArn,
        Protocol: parsed.Protocol ?? '',
        Endpoint: parsed.Endpoint ?? '',
        Attributes: parsed.Attributes,
      };
      harness.subscriptions[arn] = [...list, next];
      return { SubscriptionArn: subArn };
    }
    case 'Publish': {
      return { MessageId: `mock-${Date.now()}` };
    }
    default:
      return {};
  }
}

interface CommandLike {
  input: unknown;
  constructor: { name: string };
}

function isCommandLike(v: unknown): v is CommandLike {
  return (
    typeof v === 'object' &&
    v !== null &&
    'input' in v &&
    'constructor' in v &&
    typeof (v as { constructor?: { name?: unknown } }).constructor?.name ===
      'string'
  );
}

export class SNSClient {
  config: unknown;
  constructor(config?: unknown) {
    this.config = config;
    calls('SNSClient.ctor', config);
  }
  async send(command: unknown): Promise<unknown> {
    if (!isCommandLike(command)) {
      throw new Error('SNS mock: send() called with non-command');
    }
    const method = command.constructor.name.replace(/Command$/, '');
    calls(method, command.input);
    if (harness.nextError) {
      const err = harness.nextError;
      harness.nextError = undefined;
      const e: Error & AwsErrorShape = Object.assign(
        new Error(err.message ?? err.name ?? 'mock error'),
        { name: err.name ?? 'Error', $metadata: err.$metadata },
      );
      throw e;
    }
    return dispatch(method, command.input);
  }
}
