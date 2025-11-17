import {
  serializeToJS,
  serializeConfig,
  processTemplateVariables,
} from '../../commands/bundle/serializer';

describe('Serializer', () => {
  describe('serializeToJS', () => {
    it('should serialize primitives correctly', () => {
      expect(serializeToJS(null)).toBe('null');
      expect(serializeToJS(undefined)).toBe('undefined');
      expect(serializeToJS(true)).toBe('true');
      expect(serializeToJS(false)).toBe('false');
      expect(serializeToJS(42)).toBe('42');
      expect(serializeToJS('hello')).toBe('"hello"');
    });

    it('should serialize strings with single quotes when specified', () => {
      expect(serializeToJS('test', { singleQuotes: true })).toBe("'test'");
    });

    it('should detect and preserve arrow functions', () => {
      const fn1 = '(x) => x * 2';
      const fn2 = 'entity => entity.type === "product"';
      const fn3 = '() => { return true; }';

      expect(serializeToJS(fn1)).toBe(fn1);
      expect(serializeToJS(fn2)).toBe(fn2);
      expect(serializeToJS(fn3)).toBe(fn3);
    });

    it('should serialize arrays correctly', () => {
      expect(serializeToJS([])).toBe('[]');
      expect(serializeToJS([1, 2, 3])).toBe('[\n  1,\n  2,\n  3\n]');
      expect(serializeToJS(['a', 'b'])).toBe('[\n  "a",\n  "b"\n]');
    });

    it('should serialize objects correctly', () => {
      expect(serializeToJS({})).toBe('{}');

      const simple = { name: 'test', value: 42 };
      expect(serializeToJS(simple)).toBe('{\n  name: "test",\n  value: 42\n}');
    });

    it('should handle nested objects and arrays', () => {
      const complex = {
        settings: {
          ga4: {
            measurementId: 'G-123',
            enabled: true,
          },
        },
        items: [
          { id: 1, name: 'item1' },
          { id: 2, name: 'item2' },
        ],
      };

      const result = serializeToJS(complex);
      expect(result).toContain('settings: {');
      expect(result).toContain('ga4: {');
      expect(result).toContain('measurementId: "G-123"');
      expect(result).toContain('items: [');
    });

    it('should handle keys that need quotes', () => {
      const obj = {
        'key-with-dash': 'value1',
        '123numeric': 'value2',
        'key with space': 'value3',
        normalKey: 'value4',
      };

      const result = serializeToJS(obj);
      expect(result).toContain('"key-with-dash": "value1"');
      expect(result).toContain('"123numeric": "value2"');
      expect(result).toContain('"key with space": "value3"');
      expect(result).toContain('normalKey: "value4"');
    });
  });

  describe('serializeConfig', () => {
    it('should handle empty config', () => {
      expect(serializeConfig({})).toBe('{}');
    });

    it('should serialize config with single quotes', () => {
      const config = {
        settings: {
          endpoint: 'https://api.example.com',
        },
      };

      const result = serializeConfig(config);
      expect(result).toContain("endpoint: 'https://api.example.com'");
    });

    it('should handle complex mapping configurations', () => {
      const config = {
        mapping: {
          order: {
            complete: {
              name: 'purchase',
              data: {
                map: {
                  transaction_id: 'data.id',
                  condition: '(entity) => entity.entity === "product"',
                },
              },
            },
          },
        },
      };

      const result = serializeConfig(config);
      expect(result).toContain("name: 'purchase'");
      expect(result).toContain("transaction_id: 'data.id'");
      expect(result).toContain('(entity) => entity.entity === "product"');
    });
  });

  describe('processTemplateVariables', () => {
    it('should process sources and destinations config objects', () => {
      const variables = {
        sources: {
          browser: {
            code: 'sourceBrowser',
            config: { debug: true },
          },
        },
        destinations: {
          gtag: {
            code: 'destinationGtag',
            config: {
              settings: {
                ga4: { measurementId: 'G-123' },
              },
            },
          },
        },
      };

      const result = processTemplateVariables(variables);
      expect(result.sources?.browser?.config).toBe('{\n  debug: true\n}');
      expect(result.destinations?.gtag?.config).toContain(
        "measurementId: 'G-123'",
      );
    });

    it('should handle string configs (pass through)', () => {
      const variables = {
        sources: {
          test: {
            code: 'source',
            config: '{ debug: true }',
          },
        },
      };

      const result = processTemplateVariables(variables);
      expect(result.sources?.test?.config).toBe('{ debug: true }');
    });

    it('should handle undefined env values', () => {
      const variables = {
        sources: {
          test: {
            code: 'source',
            config: {},
            env: undefined,
          },
        },
      };

      const result = processTemplateVariables(variables);
      expect(result.sources?.test?.env).toBeUndefined();
      expect('env' in result.sources!.test).toBe(false);
    });

    it('should handle collector configuration', () => {
      const variables = {
        collector: {
          settings: {
            debug: true,
          },
        },
      };

      const result = processTemplateVariables(variables);
      expect(result.collector).toContain('debug: true');
    });

    it('should preserve other variables', () => {
      const variables = {
        title: 'My App',
        version: '1.0.0',
      };

      const result = processTemplateVariables(variables);
      expect(result.title).toBe('My App');
      expect(result.version).toBe('1.0.0');
    });
  });
});
