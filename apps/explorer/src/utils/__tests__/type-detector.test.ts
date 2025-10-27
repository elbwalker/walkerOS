import {
  detectFromValue,
  detectFromJsonSchema,
  navigateJsonSchema,
  detectNodeType,
} from '../type-detector';
import type { RJSFSchema } from '@rjsf/utils';

describe('detectFromValue', () => {
  describe('Primitives', () => {
    it('detects string as valueType', () => {
      expect(detectFromValue('data.id')).toBe('valueType');
      expect(detectFromValue('')).toBe('valueType');
    });

    it('detects number as valueType', () => {
      expect(detectFromValue(42)).toBe('valueType');
      expect(detectFromValue(0)).toBe('valueType');
    });

    it('detects boolean as boolean', () => {
      expect(detectFromValue(true)).toBe('boolean');
      expect(detectFromValue(false)).toBe('boolean');
    });

    it('detects null/undefined as valueType', () => {
      expect(detectFromValue(null)).toBe('valueType');
      expect(detectFromValue(undefined)).toBe('valueType');
    });
  });

  describe('Arrays - Loop vs Set', () => {
    it('detects empty array as set', () => {
      expect(detectFromValue([])).toBe('set');
    });

    it('detects single element array as set', () => {
      expect(detectFromValue(['value1'])).toBe('set');
    });

    it('detects loop pattern: [string, object]', () => {
      const loopValue = ['nested', { map: { item_id: 'data.id' } }];
      expect(detectFromValue(loopValue)).toBe('loop');
    });

    it('detects loop pattern: [{ key: "..." }, object]', () => {
      const loopValue = [{ key: 'data.items' }, { map: { id: 'data.id' } }];
      expect(detectFromValue(loopValue)).toBe('loop');
    });

    it('detects set with 3+ elements', () => {
      expect(detectFromValue(['value1', 'value2', 'value3'])).toBe('set');
    });

    it('detects set with 2 non-loop elements', () => {
      const setValue = [{ a: 1 }, { b: 2 }];
      expect(detectFromValue(setValue)).toBe('set');
    });
  });

  describe('Objects - ValueConfig detection', () => {
    it('detects fn property', () => {
      expect(detectFromValue({ fn: '(e) => e.data.id' })).toBe('fn');
    });

    it('detects loop property', () => {
      expect(
        detectFromValue({
          loop: ['nested', { map: { id: 'data.id' } }],
        }),
      ).toBe('loop');
    });

    it('detects map property', () => {
      expect(
        detectFromValue({
          map: {
            currency: 'data.currency',
            value: 'data.price',
          },
        }),
      ).toBe('map');
    });

    it('detects set property', () => {
      expect(
        detectFromValue({
          set: ['value1', 'value2', 'value3'],
        }),
      ).toBe('set');
    });

    it('detects condition property', () => {
      expect(detectFromValue({ condition: '(e) => e.data.id > 100' })).toBe(
        'condition',
      );
    });

    it('detects validate property', () => {
      expect(detectFromValue({ validate: '(v) => v !== null' })).toBe(
        'validate',
      );
    });

    it('detects consent-only object', () => {
      expect(detectFromValue({ consent: { marketing: true } })).toBe('consent');
    });
  });

  describe('Objects - ValueType context', () => {
    it('detects key-only object as valueType', () => {
      expect(detectFromValue({ key: 'data.id' })).toBe('valueType');
    });

    it('detects value-only object as valueType', () => {
      expect(detectFromValue({ value: 'USD' })).toBe('valueType');
    });

    it('detects key + value object as valueType', () => {
      expect(detectFromValue({ key: 'data.currency', value: 'USD' })).toBe(
        'valueType',
      );
    });

    it('detects key + consent object as valueType', () => {
      expect(
        detectFromValue({
          key: 'user.email',
          consent: { marketing: true },
        }),
      ).toBe('valueType');
    });
  });

  describe('Objects - Plain map', () => {
    it('detects plain object as map', () => {
      expect(
        detectFromValue({
          currency: 'USD',
          value: 99,
        }),
      ).toBe('map');
    });

    it('detects nested object as map', () => {
      expect(
        detectFromValue({
          ga4: { include: ['data'] },
          ads: { conversionId: 'AW-123' },
        }),
      ).toBe('map');
    });

    it('detects object with multiple properties as map', () => {
      expect(
        detectFromValue({
          item_id: 'data.id',
          item_name: 'data.name',
          price: 'data.price',
        }),
      ).toBe('map');
    });
  });

  describe('Real-world examples', () => {
    it('handles gtag mapping data structure', () => {
      const mapping = {
        map: {
          currency: { value: 'USD', key: 'data.currency' },
          value: 'data.price',
          items: {
            loop: [
              'nested',
              {
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                },
              },
            ],
          },
        },
      };

      expect(detectFromValue(mapping)).toBe('map');
      expect(detectFromValue(mapping.map)).toBe('map');
      expect(detectFromValue(mapping.map.currency)).toBe('valueType');
      expect(detectFromValue(mapping.map.items)).toBe('loop');
      expect(detectFromValue(mapping.map.items.loop)).toBe('loop');
    });

    it('handles settings structure', () => {
      const settings = {
        ga4: {
          include: ['data', 'context'],
          measurementId: 'G-ABC123',
        },
        ads: {
          conversionId: 'AW-123',
        },
      };

      expect(detectFromValue(settings)).toBe('map');
      expect(detectFromValue(settings.ga4)).toBe('map');
      expect(detectFromValue(settings.ga4.include)).toBe('set');
      expect(detectFromValue(settings.ga4.measurementId)).toBe('valueType');
    });
  });
});

describe('detectFromJsonSchema', () => {
  describe('Array types', () => {
    it('detects tuple (loop) from minItems/maxItems', () => {
      const schema: RJSFSchema = {
        type: 'array',
        minItems: 2,
        maxItems: 2,
      };
      expect(detectFromJsonSchema(schema)).toBe('loop');
    });

    it('detects generic array as set', () => {
      const schema: RJSFSchema = {
        type: 'array',
        items: { type: 'string' },
      };
      expect(detectFromJsonSchema(schema)).toBe('set');
    });

    it('detects array without constraints as set', () => {
      const schema: RJSFSchema = {
        type: 'array',
      };
      expect(detectFromJsonSchema(schema)).toBe('set');
    });
  });

  describe('Object types', () => {
    it('detects object as map', () => {
      const schema: RJSFSchema = {
        type: 'object',
        properties: {
          key1: { type: 'string' },
          key2: { type: 'number' },
        },
      };
      expect(detectFromJsonSchema(schema)).toBe('map');
    });
  });

  describe('Primitive types', () => {
    it('detects string as valueType', () => {
      expect(detectFromJsonSchema({ type: 'string' })).toBe('valueType');
    });

    it('detects number as valueType', () => {
      expect(detectFromJsonSchema({ type: 'number' })).toBe('valueType');
    });

    it('detects boolean as boolean', () => {
      expect(detectFromJsonSchema({ type: 'boolean' })).toBe('boolean');
    });
  });

  describe('Unknown types', () => {
    it('defaults to valueType for unknown types', () => {
      const schema: RJSFSchema = {
        oneOf: [{ type: 'string' }, { type: 'number' }],
      };
      expect(detectFromJsonSchema(schema)).toBe('valueType');
    });
  });
});

describe('navigateJsonSchema', () => {
  const rootSchema: RJSFSchema = {
    type: 'object',
    properties: {
      ga4: {
        type: 'object',
        properties: {
          include: {
            type: 'array',
            items: { type: 'string' },
          },
          measurementId: {
            type: 'string',
          },
          customParams: {
            type: 'object',
          },
        },
      },
      ads: {
        type: 'object',
        properties: {
          conversionId: { type: 'string' },
        },
      },
    },
  };

  it('navigates to nested property', () => {
    const path = ['product', 'view', 'settings', 'ga4', 'include'];
    const schema = navigateJsonSchema(path, rootSchema);

    expect(schema).not.toBeNull();
    expect(schema?.type).toBe('array');
  });

  it('navigates to deeply nested property', () => {
    const path = ['product', 'view', 'settings', 'ga4', 'measurementId'];
    const schema = navigateJsonSchema(path, rootSchema);

    expect(schema).not.toBeNull();
    expect(schema?.type).toBe('string');
  });

  it('handles path without settings', () => {
    const path = ['product', 'view', 'data'];
    const schema = navigateJsonSchema(path, rootSchema);

    expect(schema).toBeNull();
  });

  it('handles non-existent path', () => {
    const path = ['product', 'view', 'settings', 'nonexistent'];
    const schema = navigateJsonSchema(path, rootSchema);

    expect(schema).toBeNull();
  });

  it('stops at settings root', () => {
    const path = ['product', 'view', 'settings'];
    const schema = navigateJsonSchema(path, rootSchema);

    expect(schema).not.toBeNull();
    expect(schema?.type).toBe('object');
    expect(schema?.properties).toHaveProperty('ga4');
  });
});

describe('detectNodeType (universal detection)', () => {
  const mockSchemas = {
    mapping: {
      type: 'object',
      properties: {
        ga4: {
          type: 'object',
          properties: {
            include: {
              type: 'array',
              items: { type: 'string' },
            },
            sendPageView: {
              type: 'boolean',
            },
          },
        },
      },
    } as RJSFSchema,
  };

  describe('Priority 1: Value introspection', () => {
    it('uses value detection when value exists', () => {
      const value = { map: { currency: 'USD' } };
      const path = ['product', 'view', 'data'];

      expect(detectNodeType(value, path, mockSchemas)).toBe('map');
    });

    it('detects loop from value even with schema', () => {
      const value = ['nested', { map: { id: 'data.id' } }];
      const path = ['product', 'view', 'data', 'items'];

      expect(detectNodeType(value, path, mockSchemas)).toBe('loop');
    });
  });

  describe('Priority 2: Schema detection', () => {
    it('uses schema when value is undefined', () => {
      const path = ['product', 'view', 'settings', 'ga4', 'include'];

      expect(detectNodeType(undefined, path, mockSchemas)).toBe('set');
    });

    it('uses schema for nested settings', () => {
      const path = ['product', 'view', 'settings', 'ga4', 'sendPageView'];

      expect(detectNodeType(undefined, path, mockSchemas)).toBe('boolean');
    });

    it('detects map from object schema', () => {
      const path = ['product', 'view', 'settings', 'ga4'];

      expect(detectNodeType(undefined, path, mockSchemas)).toBe('map');
    });
  });

  describe('Priority 3: Default fallback', () => {
    it('defaults to valueType when no value and no schema', () => {
      const path = ['product', 'view', 'data'];

      expect(detectNodeType(undefined, path)).toBe('valueType');
    });

    it('defaults to valueType for non-settings paths', () => {
      const path = ['product', 'view', 'data', 'currency'];

      expect(detectNodeType(undefined, path, mockSchemas)).toBe('valueType');
    });

    it('defaults to valueType when schema not found', () => {
      const path = ['product', 'view', 'settings', 'nonexistent'];

      expect(detectNodeType(undefined, path, mockSchemas)).toBe('valueType');
    });
  });

  describe('Integration scenarios', () => {
    it('handles mixed value and schema detection', () => {
      // ga4 defined with value
      const ga4Value = { include: ['data', 'context'] };
      expect(
        detectNodeType(ga4Value, ['product', 'view', 'settings', 'ga4']),
      ).toBe('map');

      // ga4.include has value
      expect(
        detectNodeType(
          ['data', 'context'],
          ['product', 'view', 'settings', 'ga4', 'include'],
        ),
      ).toBe('set');

      // ads not defined yet - use schema
      expect(
        detectNodeType(
          undefined,
          ['product', 'view', 'settings', 'ads'],
          mockSchemas,
        ),
      ).toBe('valueType'); // No ads in schema
    });
  });
});
