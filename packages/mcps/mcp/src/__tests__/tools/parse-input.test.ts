import { z } from 'zod';
import { parseToolInput } from '../../tools/parse-input.js';

describe('parseToolInput', () => {
  const shape = {
    configPath: z.string(),
    stats: z.boolean().default(true),
    limit: z.number().optional(),
  };

  it('returns the parsed data with defaults applied', () => {
    expect(parseToolInput(shape, { configPath: './flow.json' })).toEqual({
      ok: true,
      data: { configPath: './flow.json', stats: true },
    });
  });

  it('reports each issue as one path: message line', () => {
    const parsed = parseToolInput(shape, { limit: 'ten' });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.isError).toBe(true);
    expect(parsed.error.structuredContent).toEqual({
      error:
        'configPath: Invalid input: expected string, received undefined; limit: Invalid input: expected number, received string',
    });
  });
});
