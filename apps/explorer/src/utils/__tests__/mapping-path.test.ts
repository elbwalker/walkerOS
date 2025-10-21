import {
  getValueAtPath,
  setValueAtPath,
  deleteAtPath,
  parseRulePath,
  buildRulePath,
  buildBreadcrumbSegments,
  isValidRulePath,
  getParentPath,
  isAncestorPath,
  normalizePath,
} from '../mapping-path';

describe('mapping-path utilities', () => {
  describe('getValueAtPath', () => {
    it('extracts nested values', () => {
      const obj = { data: { map: { items: 'value' } } };
      expect(getValueAtPath(obj, ['data', 'map', 'items'])).toBe('value');
    });

    it('returns undefined for missing paths', () => {
      const obj = { data: {} };
      expect(getValueAtPath(obj, ['data', 'missing'])).toBeUndefined();
    });

    it('returns the object itself for empty path', () => {
      const obj = { data: 'value' };
      expect(getValueAtPath(obj, [])).toBe(obj);
    });

    it('handles null/undefined gracefully', () => {
      expect(getValueAtPath(null, ['data'])).toBeUndefined();
      expect(getValueAtPath(undefined, ['data'])).toBeUndefined();
    });

    it('handles non-object values in path', () => {
      const obj = { data: 'string' };
      expect(getValueAtPath(obj, ['data', 'nested'])).toBeUndefined();
    });
  });

  describe('setValueAtPath', () => {
    it('sets nested values immutably', () => {
      const obj = { data: { map: {} } };
      const result = setValueAtPath(obj, ['data', 'map', 'items'], 'new');

      expect(result).toEqual({ data: { map: { items: 'new' } } });
      expect(obj).toEqual({ data: { map: {} } }); // Original unchanged
    });

    it('creates missing intermediate objects', () => {
      const obj = { data: {} };
      const result = setValueAtPath(obj, ['data', 'map', 'items'], 'value');

      expect(result).toEqual({ data: { map: { items: 'value' } } });
    });

    it('replaces non-object intermediates', () => {
      const obj = { data: 'string' };
      const result = setValueAtPath(obj, ['data', 'map'], 'value');

      expect(result).toEqual({ data: { map: 'value' } });
    });

    it('throws on non-object root', () => {
      expect(() => setValueAtPath('string', ['key'], 'value')).toThrow();
      expect(() => setValueAtPath(null, ['key'], 'value')).toThrow();
    });

    it('returns value directly for empty path', () => {
      const obj = { data: 'old' };
      const result = setValueAtPath(obj, [], 'new');

      expect(result).toBe('new');
    });
  });

  describe('deleteAtPath', () => {
    it('deletes nested keys immutably', () => {
      const obj = { data: { map: { items: 'value', other: 'keep' } } };
      const result = deleteAtPath(obj, ['data', 'map', 'items']);

      expect(result).toEqual({ data: { map: { other: 'keep' } } });
      expect(obj.data.map).toHaveProperty('items'); // Original unchanged
    });

    it('returns unchanged object for non-existent path', () => {
      const obj = { data: {} };
      const result = deleteAtPath(obj, ['data', 'missing', 'key']);

      expect(result).toEqual(obj);
    });

    it('throws on non-object root', () => {
      expect(() => deleteAtPath('string', ['key'])).toThrow();
      expect(() => deleteAtPath(null, ['key'])).toThrow();
    });

    it('returns undefined for empty path', () => {
      const obj = { data: 'value' };
      const result = deleteAtPath(obj, []);

      expect(result).toBeUndefined();
    });
  });

  describe('parseRulePath', () => {
    it('parses entity action format', () => {
      expect(parseRulePath('product view')).toEqual({
        entity: 'product',
        action: 'view',
      });
    });

    it('handles multi-word actions', () => {
      expect(parseRulePath('order complete checkout')).toEqual({
        entity: 'order',
        action: 'complete checkout',
      });
    });

    it('handles single word as entity only', () => {
      expect(parseRulePath('product')).toEqual({
        entity: 'product',
        action: undefined,
      });
    });

    it('handles empty string', () => {
      expect(parseRulePath('')).toEqual({
        entity: '',
        action: undefined,
      });
    });

    it('trims whitespace', () => {
      expect(parseRulePath('  product   view  ')).toEqual({
        entity: 'product',
        action: 'view',
      });
    });
  });

  describe('buildRulePath', () => {
    it('builds entity action format', () => {
      expect(buildRulePath('product', 'view')).toBe('product view');
    });

    it('handles empty strings', () => {
      expect(buildRulePath('', '')).toBe(' ');
    });
  });

  describe('buildBreadcrumbSegments', () => {
    it('builds segments from full path', () => {
      const segments = buildBreadcrumbSegments([
        'product',
        'view',
        'data',
        'map',
        'items',
      ]);

      expect(segments).toEqual([
        { label: 'Root', path: [], nodeType: 'root' },
        {
          label: 'product view',
          path: ['product', 'view'],
          nodeType: 'rule',
        },
        {
          label: 'Data',
          path: ['product', 'view', 'data'],
          nodeType: 'property',
        },
        {
          label: 'Map',
          path: ['product', 'view', 'data', 'map'],
          nodeType: 'nested',
        },
        {
          label: 'Items',
          path: ['product', 'view', 'data', 'map', 'items'],
          nodeType: 'nested',
        },
      ]);
    });

    it('handles rule-only path', () => {
      const segments = buildBreadcrumbSegments(['product', 'view']);

      expect(segments).toEqual([
        { label: 'Root', path: [], nodeType: 'root' },
        {
          label: 'product view',
          path: ['product', 'view'],
          nodeType: 'rule',
        },
      ]);
    });

    it('handles empty path', () => {
      const segments = buildBreadcrumbSegments([]);

      expect(segments).toEqual([{ label: 'Root', path: [], nodeType: 'root' }]);
    });

    it('capitalizes labels', () => {
      const segments = buildBreadcrumbSegments([
        'product',
        'view',
        'data',
        'map',
      ]);

      expect(segments[2].label).toBe('Data');
      expect(segments[3].label).toBe('Map');
    });
  });

  describe('isValidRulePath', () => {
    it('validates complete rule paths', () => {
      expect(isValidRulePath(['product', 'view'])).toBe(true);
      expect(isValidRulePath(['order', 'complete'])).toBe(true);
    });

    it('rejects incomplete paths', () => {
      expect(isValidRulePath(['product'])).toBe(false);
      expect(isValidRulePath([])).toBe(false);
    });

    it('rejects paths with empty strings', () => {
      expect(isValidRulePath(['', 'view'])).toBe(false);
      expect(isValidRulePath(['product', ''])).toBe(false);
    });
  });

  describe('getParentPath', () => {
    it('returns parent path', () => {
      expect(getParentPath(['data', 'map', 'items'])).toEqual(['data', 'map']);
      expect(getParentPath(['data', 'map'])).toEqual(['data']);
      expect(getParentPath(['data'])).toEqual([]);
    });

    it('handles empty path', () => {
      expect(getParentPath([])).toEqual([]);
    });
  });

  describe('isAncestorPath', () => {
    it('identifies ancestor paths', () => {
      expect(isAncestorPath(['data'], ['data', 'map'])).toBe(true);
      expect(isAncestorPath(['data', 'map'], ['data', 'map', 'items'])).toBe(
        true,
      );
    });

    it('rejects non-ancestor paths', () => {
      expect(isAncestorPath(['data', 'map'], ['data', 'set'])).toBe(false);
      expect(isAncestorPath(['data'], ['other'])).toBe(false);
    });

    it('rejects same-length or longer paths', () => {
      expect(isAncestorPath(['data', 'map'], ['data', 'map'])).toBe(false);
      expect(isAncestorPath(['data', 'map', 'items'], ['data', 'map'])).toBe(
        false,
      );
    });

    it('handles empty paths', () => {
      expect(isAncestorPath([], ['data'])).toBe(false);
      expect(isAncestorPath(['data'], [])).toBe(false);
    });
  });

  describe('normalizePath', () => {
    it('removes empty strings', () => {
      expect(normalizePath(['data', '', 'map', ''])).toEqual(['data', 'map']);
    });

    it('trims whitespace', () => {
      expect(normalizePath(['  data  ', 'map  ', '  items'])).toEqual([
        'data',
        'map',
        'items',
      ]);
    });

    it('handles already normalized paths', () => {
      expect(normalizePath(['data', 'map', 'items'])).toEqual([
        'data',
        'map',
        'items',
      ]);
    });

    it('handles empty array', () => {
      expect(normalizePath([])).toEqual([]);
    });
  });
});
