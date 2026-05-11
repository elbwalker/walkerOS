// Test-only stateful mock for the STS GetCallerIdentity probe used by setup().

const calls = jest.fn();

interface StsHarness {
  accountId: string;
  error?: unknown;
}

let harness: StsHarness = { accountId: '000000000000' };

export function __setStsHarness(patch: Partial<StsHarness>): void {
  if (typeof patch.accountId === 'string') harness.accountId = patch.accountId;
  if ('error' in patch) harness.error = patch.error;
}

export function __resetStsMock(): void {
  harness = { accountId: '000000000000' };
  calls.mockClear();
}

export interface MockStsCall {
  method: string;
  input: unknown;
}

export function __getStsMockCalls(): MockStsCall[] {
  const records: MockStsCall[] = [];
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

export class GetCallerIdentityCommand extends CommandBase {}

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

export class STSClient {
  options: unknown;
  constructor(options?: unknown) {
    this.options = options;
    calls('STSClient.ctor', options);
  }
  async send(command: unknown): Promise<unknown> {
    if (!isCommandLike(command)) {
      throw new Error('STS mock: send() called with non-command');
    }
    calls(command.constructor.name, command.input);
    if (harness.error !== undefined) {
      const err = harness.error;
      harness.error = undefined;
      throw err;
    }
    return { Account: harness.accountId };
  }
}
