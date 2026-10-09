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

  it('drops a key the shape does not name by default', () => {
    expect(
      parseToolInput(shape, { configPath: './flow.json', flowName: 'web' }),
    ).toEqual({
      ok: true,
      data: { configPath: './flow.json', stats: true },
    });
  });

  it('refuses a key the shape does not name when strict, naming it', () => {
    const parsed = parseToolInput(
      shape,
      { configPath: './flow.json', flowName: 'web' },
      { strict: true },
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.structuredContent).toEqual({
      error: 'input: Unrecognized key: "flowName"',
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
