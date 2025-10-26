import { detectFromValue } from '../type-detector';

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

    it('detects boolean as valueType', () => {
      expect(detectFromValue(true)).toBe('valueType');
      expect(detectFromValue(false)).toBe('valueType');
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
