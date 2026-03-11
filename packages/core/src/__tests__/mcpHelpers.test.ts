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

    it('uses summary as text when provided', () => {
      const result = mcpResult({ foo: 'bar' }, 'summary');
      expect(result.content[0].text).toBe('summary');
      expect(result.structuredContent).toEqual({ foo: 'bar' });
    });

    it('enriches result with _hints when provided', () => {
      const result = mcpResult({ foo: 'bar' }, 'summary', {
        next: ['do something'],
      });
      expect(result.structuredContent._hints).toEqual({
        next: ['do something'],
      });
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
  });
});
