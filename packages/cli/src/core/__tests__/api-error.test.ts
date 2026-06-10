import {
  ApiError,
  throwApiError,
  throwApiResponseError,
  handleCliError,
  EXIT_RETRYABLE,
} from '../api-error';

describe('ApiError', () => {
  it('should carry code, message, and details', () => {
    const err = new ApiError('Request validation failed', {
      code: 'VALIDATION_ERROR',
      details: [{ path: 'name', message: 'Flow name cannot be empty' }],
    });

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Request validation failed');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual([
      { path: 'name', message: 'Flow name cannot be empty' },
    ]);
  });

  it('should work with message only', () => {
    const err = new ApiError('Something broke');
    expect(err.code).toBeUndefined();
    expect(err.details).toBeUndefined();
  });

  it('should carry status, retryable, and retryAfterSeconds', () => {
    const err = new ApiError('Rate limited', {
      code: 'RATE_LIMITED',
      status: 429,
      retryable: true,
      retryAfterSeconds: 30,
    });
    expect(err.status).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.retryAfterSeconds).toBe(30);
  });
});

describe('throwApiResponseError', () => {
  function fakeResponse(status: number, retryAfter?: string): Response {
    const headers = new Headers();
    if (retryAfter !== undefined) headers.set('Retry-After', retryAfter);
    return { status, headers } as unknown as Response;
  }

  it('marks a 429 with numeric Retry-After as retryable with a wait hint', () => {
    const response = fakeResponse(429, '30');
    const body = {
      error: { code: 'RATE_LIMITED', message: 'Too many deploys' },
    };

    try {
      throwApiResponseError(response, body, 'Deploy failed');
      throw new Error('expected throw');
    } catch (e) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(429);
      expect(err.retryable).toBe(true);
      expect(err.retryAfterSeconds).toBe(30);
      expect(err.code).toBe('RATE_LIMITED');
    }
  });

  it('treats a 503 with Retry-After as retryable', () => {
    const response = fakeResponse(503, '5');
    try {
      throwApiResponseError(response, {}, 'Service unavailable');
      throw new Error('expected throw');
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(503);
      expect(err.retryable).toBe(true);
      expect(err.retryAfterSeconds).toBe(5);
    }
  });

  it('marks a 409 (already in progress) as non-retryable', () => {
    const response = fakeResponse(409);
    const body = {
      error: { code: 'DEPLOY_IN_PROGRESS', message: 'Already deploying' },
    };
    try {
      throwApiResponseError(response, body, 'Deploy failed');
      throw new Error('expected throw');
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(409);
      expect(err.retryable).toBe(false);
      expect(err.code).toBe('DEPLOY_IN_PROGRESS');
    }
  });

  it('handles an HTTP-date Retry-After value', () => {
    const future = new Date(Date.now() + 12_000).toUTCString();
    const response = fakeResponse(429, future);
    try {
      throwApiResponseError(response, {}, 'Deploy failed');
      throw new Error('expected throw');
    } catch (e) {
      const err = e as ApiError;
      expect(err.retryable).toBe(true);
      // Allow a little slack for clock/rounding.
      expect(err.retryAfterSeconds).toBeGreaterThanOrEqual(10);
      expect(err.retryAfterSeconds).toBeLessThanOrEqual(13);
    }
  });
});

describe('handleCliError machine-readable output', () => {
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`__exit__:${code}`);
      });
  });

  afterEach(() => {
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function output(): string {
    return errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
  }

  it('prints a stable parseable code line CI can branch on', () => {
    const err = new ApiError('Request validation failed', {
      code: 'VALIDATION_ERROR',
    });
    expect(() => handleCliError(err)).toThrow('__exit__:1');
    expect(output()).toMatch(/^error: code=VALIDATION_ERROR\b/m);
  });

  it('reports a retryable error with the wait hint and a distinct exit code', () => {
    const err = new ApiError('Too many deploys', {
      code: 'RATE_LIMITED',
      status: 429,
      retryable: true,
      retryAfterSeconds: 30,
    });
    expect(() => handleCliError(err)).toThrow(`__exit__:${EXIT_RETRYABLE}`);
    const out = output();
    expect(out).toMatch(/^error: code=RATE_LIMITED\b/m);
    expect(out).toMatch(/retryable=true/);
    expect(out).toMatch(/retryAfter=30/);
  });

  it('keeps non-retryable failures clearly distinct (exit 1, retryable=false)', () => {
    const err = new ApiError('Already deploying', {
      code: 'DEPLOY_IN_PROGRESS',
      status: 409,
      retryable: false,
    });
    expect(() => handleCliError(err)).toThrow('__exit__:1');
    expect(output()).toMatch(/retryable=false/);
  });

  it('falls back to code=UNKNOWN for a plain Error', () => {
    expect(() => handleCliError(new Error('boom'))).toThrow('__exit__:1');
    expect(output()).toMatch(/^error: code=UNKNOWN\b/m);
  });
});

describe('throwApiError', () => {
  it('should extract structured error from openapi-fetch error object', () => {
    const apiError = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          errors: [
            {
              path: 'config.version',
              message: 'Only version 3 is supported.',
            },
          ],
        },
      },
    };

    expect(() => throwApiError(apiError, 'Failed to create flow')).toThrow(
      ApiError,
    );

    try {
      throwApiError(apiError, 'Failed to create flow');
    } catch (e) {
      const err = e as ApiError;
      expect(err.message).toBe('Request validation failed');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual([
        { path: 'config.version', message: 'Only version 3 is supported.' },
      ]);
    }
  });

  it('should fall back to generic message when error has no structure', () => {
    expect(() => throwApiError({}, 'Failed to create flow')).toThrow(
      'Failed to create flow',
    );
  });

  it('should handle null/undefined error', () => {
    expect(() => throwApiError(null, 'Fallback')).toThrow('Fallback');
  });
});
