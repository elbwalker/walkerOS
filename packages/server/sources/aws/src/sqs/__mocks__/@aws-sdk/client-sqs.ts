// Test-only stateful harness emulating the subset of @aws-sdk/client-sqs the
// SQS source uses: SQSClient with send() dispatch, all command classes
// (Create / Get / List / Receive / Delete), plus harness helpers letting tests
// program queue state, receive batches, and per-call errors.
//
// Mirrors the structure of the Pub/Sub source's __mocks__/@google-cloud/pubsub.ts.
// Zero casts in tests by virtue of jest.mock + ambient .d.ts.

const calls = jest.fn();

interface QueueHarness {
  url: string;
  arn: string;
  attributes: Record<string, string>;
  tags: Record<string, string>;
}

interface MessageRecord {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
  Attributes?: Record<string, string>;
  MessageAttributes?: Record<
    string,
    { DataType: string; StringValue?: string }
  >;
}

interface ReceiveBatch {
  Messages: MessageRecord[];
}

interface CreateQueueInput {
  QueueName: string;
  Attributes?: Record<string, string>;
  tags?: Record<string, string>;
}

interface GetQueueUrlInput {
  QueueName: string;
}

interface GetQueueAttributesInput {
  QueueUrl: string;
  AttributeNames?: string[];
}

interface ListQueueTagsInput {
  QueueUrl: string;
}

interface DeleteMessageInput {
  ReceiptHandle: string;
  QueueUrl: string;
}

interface MockState {
  queues: Map<string, QueueHarness>; // keyed by queueName
  receiveBatches: ReceiveBatch[];
  createQueueError?: Error;
  getQueueUrlError?: Error;
  deletedReceiptHandles: string[];
}

const state: MockState = {
  queues: new Map(),
  receiveBatches: [],
  deletedReceiptHandles: [],
};

export function __resetMockCalls(): void {
  state.queues = new Map();
  state.receiveBatches = [];
  state.createQueueError = undefined;
  state.getQueueUrlError = undefined;
  state.deletedReceiptHandles = [];
  calls.mockClear();
}

export function __setQueueHarness(
  name: string,
  patch: Partial<QueueHarness>,
): void {
  const existing = state.queues.get(name) ?? {
    url: `https://sqs.eu-central-1.amazonaws.com/000000000000/${name}`,
    arn: `arn:aws:sqs:eu-central-1:000000000000:${name}`,
    attributes: {},
    tags: {},
  };
  state.queues.set(name, { ...existing, ...patch });
}

export function __setReceiveMessagesHarness(batches: ReceiveBatch[]): void {
  state.receiveBatches = [...batches];
}

export function __setCreateQueueError(err: Error | undefined): void {
  state.createQueueError = err;
}

export function __setGetQueueUrlError(err: Error | undefined): void {
  state.getQueueUrlError = err;
}

export function __getDeletedReceiptHandles(): string[] {
  return state.deletedReceiptHandles;
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

class CommandBase<I = unknown> {
  input: I;
  constructor(input: I) {
    this.input = input;
  }
}

export class CreateQueueCommand extends CommandBase<CreateQueueInput> {}
export class GetQueueUrlCommand extends CommandBase<GetQueueUrlInput> {}
export class GetQueueAttributesCommand extends CommandBase<GetQueueAttributesInput> {}
export class ListQueueTagsCommand extends CommandBase<ListQueueTagsInput> {}
export class SetQueueAttributesCommand extends CommandBase {}
export class ReceiveMessageCommand extends CommandBase {}
export class DeleteMessageCommand extends CommandBase<DeleteMessageInput> {}

function isCreateQueueInput(input: unknown): input is CreateQueueInput {
  if (typeof input !== 'object' || input === null) return false;
  const obj: { QueueName?: unknown } = input;
  return typeof obj.QueueName === 'string';
}

function isGetQueueUrlInput(input: unknown): input is GetQueueUrlInput {
  if (typeof input !== 'object' || input === null) return false;
  const obj: { QueueName?: unknown } = input;
  return typeof obj.QueueName === 'string';
}

function isGetQueueAttributesInput(
  input: unknown,
): input is GetQueueAttributesInput {
  if (typeof input !== 'object' || input === null) return false;
  const obj: { QueueUrl?: unknown } = input;
  return typeof obj.QueueUrl === 'string';
}

function isDeleteMessageInput(input: unknown): input is DeleteMessageInput {
  if (typeof input !== 'object' || input === null) return false;
  const obj: { ReceiptHandle?: unknown; QueueUrl?: unknown } = input;
  return (
    typeof obj.ReceiptHandle === 'string' && typeof obj.QueueUrl === 'string'
  );
}

interface CommandLike {
  input: unknown;
  constructor: { name: string };
}

export class SQSClient {
  config: unknown;
  constructor(config?: unknown) {
    this.config = config;
    calls('SQSClient.ctor', config);
  }

  async send(command: CommandLike): Promise<unknown> {
    const name = command.constructor.name;
    calls(name, command.input);

    if (name === 'CreateQueueCommand') return this.handleCreate(command.input);
    if (name === 'GetQueueUrlCommand') return this.handleGetUrl(command.input);
    if (name === 'GetQueueAttributesCommand')
      return this.handleGetAttrs(command.input);
    if (name === 'ListQueueTagsCommand')
      return this.handleListTags(command.input);
    if (name === 'ReceiveMessageCommand') return this.handleReceive();
    if (name === 'DeleteMessageCommand')
      return this.handleDelete(command.input);
    if (name === 'SetQueueAttributesCommand') {
      // Setup MUST NOT call this. Per the authoritative-apply model, setup
      // writes declared state via CreateQueueCommand only. If a test sees this
      // command, setup is mutating outside the contract; tests fail on assertion.
      return {};
    }

    throw new Error(`SQSClient mock: unsupported command ${name}`);
  }

  destroy(): void {
    calls('SQSClient.destroy', undefined);
  }

  private async handleCreate(input: unknown): Promise<unknown> {
    if (state.createQueueError) {
      const err = state.createQueueError;
      state.createQueueError = undefined;
      throw err;
    }
    if (!isCreateQueueInput(input)) {
      throw new Error('SQSClient mock: CreateQueueCommand input invalid');
    }
    const url = `https://sqs.eu-central-1.amazonaws.com/000000000000/${input.QueueName}`;
    const arn = `arn:aws:sqs:eu-central-1:000000000000:${input.QueueName}`;
    const existing = state.queues.get(input.QueueName);
    state.queues.set(input.QueueName, {
      url,
      arn,
      attributes: {
        ...(existing?.attributes ?? {}),
        ...(input.Attributes ?? {}),
        QueueArn: arn,
      },
      tags: { ...(existing?.tags ?? {}), ...(input.tags ?? {}) },
    });
    return { QueueUrl: url };
  }

  private async handleGetUrl(input: unknown): Promise<unknown> {
    if (state.getQueueUrlError) {
      const err = state.getQueueUrlError;
      state.getQueueUrlError = undefined;
      throw err;
    }
    if (!isGetQueueUrlInput(input)) {
      throw new Error('SQSClient mock: GetQueueUrlCommand input invalid');
    }
    const q = state.queues.get(input.QueueName);
    if (!q) {
      const err: Error & { name: string } = new Error(
        `Queue ${input.QueueName} does not exist`,
      );
      err.name = 'QueueDoesNotExist';
      throw err;
    }
    return { QueueUrl: q.url };
  }

  private async handleGetAttrs(input: unknown): Promise<unknown> {
    if (!isGetQueueAttributesInput(input)) return { Attributes: {} };
    for (const q of state.queues.values()) {
      if (q.url === input.QueueUrl) return { Attributes: q.attributes };
    }
    return { Attributes: {} };
  }

  private async handleListTags(input: unknown): Promise<unknown> {
    if (!isGetQueueAttributesInput(input)) return {};
    for (const q of state.queues.values()) {
      if (q.url === input.QueueUrl) return { Tags: q.tags };
    }
    return {};
  }

  private async handleReceive(): Promise<unknown> {
    const batch = state.receiveBatches.shift();
    if (!batch) {
      // Simulate the long-poll wait so the loop yields control. Without this,
      // the test process tight-loops calling Receive thousands of times per
      // second and OOMs under jest worker accounting.
      await new Promise<void>((r) => setTimeout(r, 50));
      return {};
    }
    return batch;
  }

  private async handleDelete(input: unknown): Promise<unknown> {
    if (!isDeleteMessageInput(input)) return {};
    state.deletedReceiptHandles.push(input.ReceiptHandle);
    return {};
  }
}
