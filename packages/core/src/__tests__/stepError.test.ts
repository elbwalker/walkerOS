import { StepError, toFailureReason } from '../stepError';

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
