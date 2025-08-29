import {
  getAttribute,
  splitAttribute,
  splitKeyVal,
  parseInlineConfig,
} from '../attributes';

describe('attributes', () => {
  describe('getAttribute', () => {
    it('should get attribute value from element', () => {
      const element = document.createElement('div');
      element.setAttribute('data-test', ' value ');
      expect(getAttribute(element, 'data-test')).toBe('value');
    });

    it('should return empty string for missing attribute', () => {
      const element = document.createElement('div');
      expect(getAttribute(element, 'data-missing')).toBe('');
    });

    it('should handle empty attribute value', () => {
      const element = document.createElement('div');
      element.setAttribute('data-empty', '');
      expect(getAttribute(element, 'data-empty')).toBe('');
    });
  });

  describe('splitAttribute', () => {
    it('should split simple attributes', () => {
      expect(splitAttribute('a;b;c')).toEqual(['a', 'b', 'c']);
    });

    it('should handle quoted values with separator', () => {
      expect(splitAttribute("a;'b;c';d")).toEqual(['a', "'b;c'", 'd']);
    });

    it('should handle empty string', () => {
      expect(splitAttribute('')).toEqual([]);
    });

    it('should handle custom separator', () => {
      expect(splitAttribute('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('should handle whitespace', () => {
      expect(splitAttribute('a; b ; c')).toEqual(['a', ' b ', ' c']);
    });
  });

  describe('splitKeyVal', () => {
    it('should split key-value pairs', () => {
      expect(splitKeyVal('key:value')).toEqual(['key', 'value']);
    });

    it('should handle values with colons', () => {
      expect(splitKeyVal('url:https://example.com:8080')).toEqual([
        'url',
        'https://example.com:8080',
      ]);
    });

    it('should trim whitespace', () => {
      expect(splitKeyVal(' key : value ')).toEqual(['key', 'value']);
    });

    it('should handle key without value', () => {
      expect(splitKeyVal('key')).toEqual(['key', '']);
    });

    it('should handle empty string', () => {
      expect(splitKeyVal('')).toEqual(['', '']);
    });

    it('should handle quoted values', () => {
      expect(splitKeyVal("key:'quoted value'")).toEqual([
        'key',
        'quoted value',
      ]);
    });
  });

  describe('parseInlineConfig', () => {
    it('should parse boolean values', () => {
      const config = parseInlineConfig('enabled:true;disabled:false');
      expect(config).toEqual({
        enabled: true,
        disabled: false,
      });
    });

    it('should parse numeric values', () => {
      const config = parseInlineConfig('port:3000;timeout:5.5;version:2');
      expect(config).toEqual({
        port: 3000,
        timeout: 5.5,
        version: 2,
      });
    });

    it('should parse string values', () => {
      const config = parseInlineConfig('name:walker;env:production');
      expect(config).toEqual({
        name: 'walker',
        env: 'production',
      });
    });

    it('should handle keys without values as true', () => {
      const config = parseInlineConfig('debug;verbose;active');
      expect(config).toEqual({
        debug: true,
        verbose: true,
        active: true,
      });
    });

    it('should handle mixed types', () => {
      const config = parseInlineConfig(
        'name:walker;port:8080;debug:true;ratio:0.5;enabled',
      );
      expect(config).toEqual({
        name: 'walker',
        port: 8080,
        debug: true,
        ratio: 0.5,
        enabled: true,
      });
    });

    it('should handle empty string', () => {
      expect(parseInlineConfig('')).toEqual({});
    });

    it('should ignore empty keys', () => {
      const config = parseInlineConfig(';key:value;;');
      expect(config).toEqual({
        key: 'value',
      });
    });

    it('should handle special characters in values', () => {
      const config = parseInlineConfig('url:https://example.com;path:/api/v1');
      expect(config).toEqual({
        url: 'https://example.com',
        path: '/api/v1',
      });
    });

    it('should handle quoted values', () => {
      const config = parseInlineConfig("message:'hello world';code:200");
      expect(config).toEqual({
        message: 'hello world',
        code: 200,
      });
    });
  });
});
