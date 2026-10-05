import { mcpResult, mcpError } from '../mcpHelpers';

describe('mcpHelpers', () => {
  describe('mcpResult', () => {
    it('returns content with JSON text and structuredContent', () => {
      const data = { id: 'proj_123', name: 'Test' };
      const result = mcpResult(data);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(data);
      expect(result.structuredContent).toEqual(data);
    });

    it('enriches result with _hints when provided', () => {
      const result = mcpResult(
        { foo: 'bar' },
        {
          next: ['do something'],
        },
      );
      expect(result.structuredContent._hints).toEqual({
        next: ['do something'],
      });
    });

    it('answers an array as { items }, never a bare or spread array', () => {
      const rows = [{ id: 'a' }, { id: 'b' }];
      const plain = mcpResult(rows);
      expect(plain.structuredContent).toEqual({ items: rows });

      const hinted = mcpResult(rows, { next: ['more'] });
      expect(hinted.structuredContent).toEqual({
        items: rows,
        _hints: { next: ['more'] },
      });
      expect(hinted.structuredContent).not.toHaveProperty('0');
    });

    it.each([
      ['undefined', undefined, null],
      ['null', null, null],
      ['a string', 'done', 'done'],
      ['a number', 3, 3],
      ['a boolean', false, false],
    ])('answers %s as { value }', (_label, input, value) => {
      expect(mcpResult(input).structuredContent).toEqual({ value });
    });

    it.each([
      ['an object', { id: 'p' }],
      ['an array', [1, 2]],
      ['undefined', undefined],
    ])('serializes the same body into text for %s', (_label, input) => {
      const result = mcpResult(input, { warnings: ['w'] });
      expect(JSON.parse(result.content[0].text)).toStrictEqual(
        result.structuredContent,
      );
    });
  });

  describe('mcpError', () => {
    it('returns isError with Error message', () => {
      const result = mcpError(new Error('Not found'));
      expect(result.isError).toBe(true);
      expect(result.structuredContent.error).toBe('Not found');
    });

    it('handles string errors', () => {
      const result = mcpError('something broke');
      expect(result.structuredContent.error).toBe('something broke');
      expect(result.content[0].text).toContain('something broke');
    });

    it('handles objects with message property', () => {
      const result = mcpError({ message: 'bad request', code: 'EINVAL' });
      expect(result.structuredContent.error).toBe('bad request');
    });

    it('handles Zod-like errors with issues array', () => {
      const zodError = {
        issues: [{ path: ['version'], message: 'Required' }],
      };
      const result = mcpError(zodError);
      expect(result.structuredContent.error).toContain('Required');
      expect(result.structuredContent.path).toBe('version');
    });

    it('returns structuredContent with hint', () => {
      const result = mcpError(new Error('fail'), 'try again');
      expect(result.structuredContent).toEqual({
        error: 'fail',
        hint: 'try again',
      });
    });

    it('falls back to Unknown error for unrecognized types', () => {
      const result = mcpError(42);
      expect(result.structuredContent.error).toBe('Unknown error');
      expect(result.isError).toBe(true);
    });

    it('should extract code and details from ApiError-shaped objects', () => {
      const error = Object.assign(new Error('Request validation failed'), {
        name: 'ApiError',
        code: 'VALIDATION_ERROR',
        details: [{ path: 'name', message: 'Flow name cannot be empty' }],
      });

      const result = mcpError(error);
      expect(result.structuredContent.error).toBe('Request validation failed');
      expect(result.structuredContent.code).toBe('VALIDATION_ERROR');
      expect(result.structuredContent.details).toEqual([
        { path: 'name', message: 'Flow name cannot be empty' },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should not include code or details for plain Error', () => {
      const result = mcpError(new Error('boom'));
      expect(result.structuredContent.error).toBe('boom');
      expect(result.structuredContent.code).toBeUndefined();
      expect(result.structuredContent.details).toBeUndefined();
    });

    it('should handle Zod-style errors with multiple issues', () => {
      const zodError = {
        issues: [
          { path: ['config', 'version'], message: 'Required' },
          { path: ['name'], message: 'Too short' },
        ],
      };
      const result = mcpError(zodError);
      expect(result.structuredContent.error).toBe('Required; Too short');
      expect(result.structuredContent.path).toBe('config.version');
    });
  });
});
