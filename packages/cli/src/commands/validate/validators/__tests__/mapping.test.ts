// walkerOS/packages/cli/src/commands/validate/validators/__tests__/mapping.test.ts

import { describe, it, expect } from '@jest/globals';
import { validateMapping } from '../mapping.js';

describe('validateMapping', () => {
  it('passes valid mapping with event patterns', () => {
    const result = validateMapping({
      'page view': {
        name: 'page_view',
        data: { page_title: { key: 'data.title' } },
      },
      'product view': {
        name: 'view_item',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('extracts event patterns in details', () => {
    const result = validateMapping({
      'page view': { name: 'page_view' },
      'product *': { name: 'product_event' },
      '*': { name: 'generic' },
    });

    expect(result.details.eventPatterns).toEqual([
      'page view',
      'product *',
      '*',
    ]);
    expect(result.details.patternCount).toBe(3);
  });

  it('warns about catch-all pattern not being last', () => {
    const result = validateMapping({
      '*': { name: 'generic' },
      'page view': { name: 'page_view' },
    });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: '*',
        suggestion: expect.stringContaining('last'),
      }),
    );
  });

  it('validates mapping rule structure', () => {
    const result = validateMapping({
      'page view': {
        name: 'page_view',
        data: {
          nested: {
            key: 'data.value',
            map: { a: 'A', b: 'B' },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it('fails on invalid event pattern (no space, not wildcard)', () => {
    const result = validateMapping({
      pageview: { name: 'page_view' },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'pageview',
        code: 'INVALID_EVENT_PATTERN',
      }),
    );
  });

  it('accepts wildcard patterns', () => {
    const result = validateMapping({
      '*': { name: 'all' },
      'product *': { name: 'product' },
      '* view': { name: 'views' },
    });

    expect(result.valid).toBe(true);
  });
});
