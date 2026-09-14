import { classifyConfigInput, createHostedRuntime } from '../hosted.js';
import { RuntimeRefusal } from '../types.js';
import { stubClient } from '../../__tests__/support/stub-client.js';

/** Await a rejection, typed, so its message can be asserted. */
async function errorOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('expected a rejection');
}

/** Await a refusal specifically, so its hint can be asserted too. */
async function refusalOf(promise: Promise<unknown>): Promise<RuntimeRefusal> {
  const error = await errorOf(promise);
  if (error instanceof RuntimeRefusal) return error;
  throw new Error(`expected a RuntimeRefusal, got: ${error.message}`);
}

describe('classifyConfigInput', () => {
  it.each([
    ['{"version":4}', 'inline-json'],
    ['  [1,2]', 'inline-json'],
    ['flow_abc123', 'cloud-id'],
    ['cfg_abc-123', 'cloud-id'],
    ['http://127.0.0.1/x', 'url'],
    ['https://example.com/flow.json', 'url'],
    ['/etc/passwd', 'local-path'],
    ['./flow.json', 'local-path'],
    ['file:///etc/passwd', 'local-path'],
    ['flow.json', 'local-path'],
    ['.env', 'local-path'],
    // A prefix is not an id: the pattern is anchored to id characters.
    ['flow_../x', 'local-path'],
    ['page view', 'bare-string'],
    ['passwd', 'bare-string'],
  ])('classifies %p as %s', (input, expected) => {
    expect(classifyConfigInput(input)).toBe(expected);
  });
});

describe('createHostedRuntime', () => {
  const getFlow = jest.fn(async () => ({ config: { version: 4, flows: {} } }));
  const runtime = createHostedRuntime(stubClient({ getFlow }));

  beforeEach(() => getFlow.mockClear());

  it('provides no bundle, simulate or push', () => {
    expect(runtime.bundle).toBeUndefined();
    expect(runtime.simulate).toBeUndefined();
    expect(runtime.push).toBeUndefined();
  });

  describe('load', () => {
    it.each([
      ['a local path', '/etc/passwd', /local file paths/i],
      ['a URL', 'http://169.254.169.254/latest/meta-data/', /fetching urls/i],
      [
        'a path that merely starts with an id prefix',
        'flow_../x',
        /local file paths/i,
      ],
    ])(
      'refuses %s with a hint, reading nothing',
      async (_label, input, message) => {
        const error = await refusalOf(runtime.load(input));
        expect(error.message).toMatch(message);
        expect(error.message).toMatch(/hosted/i);
        expect(error.hint).toMatch(/inline as JSON/);
        expect(getFlow).not.toHaveBeenCalled();
      },
    );

    it('parses inline JSON without touching the client', async () => {
      await expect(runtime.load(' {"version":4} ')).resolves.toEqual({
        version: 4,
      });
      expect(getFlow).not.toHaveBeenCalled();
    });

    it('resolves a saved flow id through the access-scoped client', async () => {
      await expect(runtime.load('flow_saved')).resolves.toEqual({
        version: 4,
        flows: {},
      });
      expect(getFlow).toHaveBeenCalledWith({ flowId: 'flow_saved' });
    });

    it('returns an empty config for a flow record without one', async () => {
      getFlow.mockResolvedValueOnce({} as never);
      await expect(runtime.load('flow_bare')).resolves.toEqual({});
    });

    it("reports invalid inline JSON as the caller's own input error", async () => {
      await expect(runtime.load('{not json')).rejects.toThrow(
        /appears to be JSON but contains errors/,
      );
    });

    it('requires an input, as a plain error rather than a refusal', async () => {
      const error = await errorOf(runtime.load('   '));
      expect(error).not.toBeInstanceOf(RuntimeRefusal);
      expect(error.message).toBe('Input is required');
    });

    it('cannot resolve a bare phrase, as a plain error, reading nothing', async () => {
      const error = await errorOf(runtime.load('page view'));
      expect(error).not.toBeInstanceOf(RuntimeRefusal);
      expect(error.message).toMatch(/cannot resolve "page view"/i);
      expect(error.message).toMatch(/inline as JSON/);
      expect(getFlow).not.toHaveBeenCalled();
    });
  });
});
