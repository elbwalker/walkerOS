import { ApiError, handleCliError, EXIT_RETRYABLE } from '../api-error';

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
