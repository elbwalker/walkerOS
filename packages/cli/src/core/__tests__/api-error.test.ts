import { ApiError, throwApiError } from '../api-error';

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
