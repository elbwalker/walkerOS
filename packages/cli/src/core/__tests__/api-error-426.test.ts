import { ApiError, throwApiError } from '../api-error';

describe('ApiError CLIENT_OUTDATED (HTTP 426)', () => {
  it('populates upgrade metadata from CLIENT_OUTDATED payload', () => {
    const payload = {
      error: {
        code: 'CLIENT_OUTDATED',
        message:
          'This endpoint requires @walkeros/cli >= 3.5.0 (you are on 3.3.1).',
        minVersion: '3.5.0',
        clientVersion: '3.3.1',
        client: 'cli',
        upgrade: 'npm install -g @walkeros/cli@latest',
        docs: 'https://walkeros.io/docs/upgrading',
      },
    };

    expect(() => throwApiError(payload, 'fallback')).toThrow(ApiError);

    try {
      throwApiError(payload, 'fallback');
    } catch (e) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('CLIENT_OUTDATED');
      expect(err.message).toBe(
        'This endpoint requires @walkeros/cli >= 3.5.0 (you are on 3.3.1).',
      );
      expect(err.minVersion).toBe('3.5.0');
      expect(err.clientVersion).toBe('3.3.1');
      expect(err.client).toBe('cli');
      expect(err.upgrade).toBe('npm install -g @walkeros/cli@latest');
      expect(err.docs).toBe('https://walkeros.io/docs/upgrading');
    }
  });

  it('does NOT populate upgrade fields for non-CLIENT_OUTDATED errors', () => {
    const payload = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        // These fields should be ignored for non-CLIENT_OUTDATED codes,
        // even if the server accidentally includes them.
        minVersion: '3.5.0',
        upgrade: 'npm install',
      },
    };

    try {
      throwApiError(payload, 'fallback');
    } catch (e) {
      const err = e as ApiError;
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.minVersion).toBeUndefined();
      expect(err.clientVersion).toBeUndefined();
      expect(err.client).toBeUndefined();
      expect(err.upgrade).toBeUndefined();
      expect(err.docs).toBeUndefined();
    }
  });

  it('falls back to generic message on malformed payload (regression)', () => {
    expect(() => throwApiError({ nope: true }, 'Fallback message')).toThrow(
      'Fallback message',
    );

    try {
      throwApiError({ nope: true }, 'Fallback message');
    } catch (e) {
      const err = e as ApiError;
      expect(err.code).toBeUndefined();
      expect(err.minVersion).toBeUndefined();
      expect(err.upgrade).toBeUndefined();
    }
  });

  it('ApiError constructor accepts upgrade fields directly', () => {
    const err = new ApiError('Upgrade needed', {
      code: 'CLIENT_OUTDATED',
      minVersion: '3.5.0',
      clientVersion: '3.3.1',
      client: 'cli',
      upgrade: 'npm install -g @walkeros/cli@latest',
      docs: 'https://walkeros.io/docs/upgrading',
    });
    expect(err.code).toBe('CLIENT_OUTDATED');
    expect(err.minVersion).toBe('3.5.0');
    expect(err.clientVersion).toBe('3.3.1');
    expect(err.client).toBe('cli');
    expect(err.upgrade).toBe('npm install -g @walkeros/cli@latest');
    expect(err.docs).toBe('https://walkeros.io/docs/upgrading');
  });
});
