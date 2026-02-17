import { apiResult, apiError } from '../../tools/helpers.js';

describe('tool helpers', () => {
  describe('apiResult', () => {
    it('returns content with JSON text and structuredContent', () => {
      const data = { id: 'proj_123', name: 'Test' };
      const result = apiResult(data);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(data);
      expect(result.structuredContent).toEqual(data);
    });
  });

  describe('apiError', () => {
    it('returns isError with Error message', () => {
      const result = apiError(new Error('Not found'));
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text)).toEqual({
        error: 'Not found',
      });
    });

    it('returns isError with unknown error for non-Error', () => {
      const result = apiError('string');
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text)).toEqual({
        error: 'Unknown error',
      });
    });
  });
});
