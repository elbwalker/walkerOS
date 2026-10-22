import type * as FatalErrorModule from '../fatalError';
import type * as StepErrorModule from '../stepError';
import {
  networkErrorMessage,
  StepError,
  stepCall,
  toFailureReason,
} from '../stepError';

/**
 * Loads a module under an `Error` that drops the ES2022 options argument, as
 * a browser without `ErrorOptions` does.
 */
function underLegacyError<T extends object>(path: string): T {
  const Native = globalThis.Error;
  class LegacyError extends Native {
    constructor(message?: string) {
      super(message);
    }
  }
  const setError = (value: ErrorConstructor | typeof LegacyError) =>
    Object.defineProperty(globalThis, 'Error', {
      value,
      configurable: true,
      writable: true,
    });
  setError(LegacyError);
  try {
    let loaded: T | undefined;
    jest.isolateModules(() => {
      loaded = jest.requireActual<T>(path);
    });
    if (loaded === undefined) throw new Error(`${path} did not load`);
    return loaded;
  } finally {
    setError(Native);
  }
}

describe('cause without ES2022 ErrorOptions', () => {
  const original = new Error('original');

  it('StepError keeps its cause as an own property', () => {
    const { StepError: Legacy } =
      underLegacyError<typeof StepErrorModule>('../stepError');
    const error = new Legacy('m', { code: 'transport', cause: original });
    expect(error.cause).toBe(original);
    expect(Object.prototype.hasOwnProperty.call(error, 'cause')).toBe(true);
  });

  it('FatalError keeps its cause as an own property', () => {
    const { FatalError: Legacy } =
      underLegacyError<typeof FatalErrorModule>('../fatalError');
    const error = new Legacy('m', { cause: original });
    expect(error.cause).toBe(original);
    expect(Object.prototype.hasOwnProperty.call(error, 'cause')).toBe(true);
  });
});

describe('StepError', () => {
  it('carries code, status, retryable and the response body', () => {
    const err = new StepError('Config settings apiKey missing', {
      code: 'config',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('StepError');
    expect(err.code).toBe('config');
    expect(err.retryable).toBe(false);
    const http = new StepError('HTTP 400', {
      code: 'transport',
      status: 400,
      body: { error: 'bad' },
    });
    expect(http.body).toEqual({ error: 'bad' });
    expect(http.message).toBe('HTTP 400');
  });

  it.each([
    'transport',
    'timeout',
    'breaker-open',
    'blocked',
    'queue-full',
    'vendor-not-ready',
    'vendor-timeout',
  ])('%s defaults to retryable', (code) => {
    expect(new StepError('x', { code }).retryable).toBe(true);
  });

  it.each([
    'config',
    'not-ready',
    'mapping',
    'transformer',
    'missing-input',
    'vendor-not-loaded',
    'a-code-of-its-own',
  ])('%s defaults to not retryable', (code) => {
    expect(new StepError('x', { code }).retryable).toBe(false);
  });

  it('lets the status, then an explicit option, override the code default', () => {
    expect(
      new StepError('x', { code: 'transport', status: 400 }).retryable,
    ).toBe(false);
    expect(
      new StepError('x', { code: 'transport', status: 429 }).retryable,
    ).toBe(true);
    expect(
      new StepError('x', { code: 'transport', status: 503 }).retryable,
    ).toBe(true);
    expect(
      new StepError('x', { code: 'transport', status: 503, retryable: false })
        .retryable,
    ).toBe(false);
  });

  it('maps any thrown value to a reason without payload or body', () => {
    expect(toFailureReason(new Error('boom'))).toEqual({
      code: 'transport',
      message: 'boom',
      retryable: true,
    });
    expect(toFailureReason(new StepError('late', { code: 'timeout' }))).toEqual(
      { code: 'timeout', message: 'late', retryable: true },
    );
    expect(
      toFailureReason(
        new StepError('HTTP 400', {
          code: 'transport',
          status: 400,
          body: { email: 'a@b.c' },
        }),
      ),
    ).toEqual({
      code: 'transport',
      message: 'HTTP 400',
      retryable: false,
      status: 400,
    });
  });

  it('caps the message at 300 characters', () => {
    expect(toFailureReason(new Error('a'.repeat(500))).message).toHaveLength(
      300,
    );
  });
});

describe('networkErrorMessage', () => {
  const withCause = (cause: unknown) =>
    Object.assign(new TypeError('fetch failed'), { cause });

  it.each<[string, unknown, string]>([
    [
      'a cause code, never the cause message',
      withCause(
        Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9?key=s'), {
          code: 'ECONNREFUSED',
        }),
      ),
      'fetch failed (ECONNREFUSED)',
    ],
    [
      'a cause without a code',
      withCause(new Error('socket hang up')),
      'fetch failed',
    ],
    [
      'a cause code that is not a string',
      withCause({ code: 13 }),
      'fetch failed',
    ],
    ['no cause', new TypeError('Failed to fetch'), 'Failed to fetch'],
    ['a thrown value that is not an error', 'refused', 'Network error'],
  ])('%s', (_, error, expected) => {
    expect(networkErrorMessage(error)).toBe(expected);
  });
});

describe('stepCall', () => {
  it('answers what the call returns, sync or async', async () => {
    await expect(stepCall(() => 1, 'transport', 'Call failed')).resolves.toBe(
      1,
    );
    await expect(
      stepCall(() => Promise.resolve('done'), 'transport', 'Call failed'),
    ).resolves.toBe('done');
  });

  it.each<[string, () => unknown]>([
    [
      'a throw',
      () => {
        throw new Error('Request failed: jane@example.com');
      },
    ],
    [
      'a rejection',
      () => Promise.reject(new Error('Request failed: jane@example.com')),
    ],
  ])(
    'wraps %s in its code and message, the original as cause only',
    async (_, call) => {
      const error = await stepCall(
        call,
        'transport',
        'Vendor call failed',
      ).then(
        () => undefined,
        (thrown: unknown) => thrown,
      );
      expect(error).toBeInstanceOf(StepError);
      expect(error).toMatchObject({
        code: 'transport',
        message: 'Vendor call failed',
        retryable: true,
      });
      expect(error instanceof StepError && error.cause).toBeInstanceOf(Error);
    },
  );

  it('passes a StepError through unchanged, its own code winning', async () => {
    const own = new StepError('Vendor script failed to load', {
      code: 'vendor-not-loaded',
    });
    await expect(
      stepCall(
        () => {
          throw own;
        },
        'transport',
        'Vendor call failed',
      ),
    ).rejects.toBe(own);
  });
});
