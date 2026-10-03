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

    it.each([
      ['escaped separator', String.raw`a\;b;c`, [String.raw`a\;b`, 'c']],
      [
        'escaped quote',
        String.raw`a\'b;c\'d`,
        [String.raw`a\'b`, String.raw`c\'d`],
      ],
      ['escaped backslash', String.raw`a\\;b`, [String.raw`a\\`, 'b']],
      [
        'escape inside quotes',
        String.raw`'a\';b';c`,
        [String.raw`'a\';b'`, 'c'],
      ],
      ['unclosed quote', "k:Men's shirt;s:L", ["k:Men's shirt", 's:L']],
      ['lone trailing backslash', 'a\\', ['a\\']],
    ])('should keep %s in its part', (_, str, expected) => {
      expect(splitAttribute(str)).toEqual(expected);
    });

    it.each([
      [
        'apostrophes in text',
        "name:Men's shirt;brand:Levi's",
        ["name:Men's shirt", "brand:Levi's"],
      ],
      ['an apostrophe in a quoted value', "k:'it's';b:1", ["k:'it's'", 'b:1']],
      ['a quoted key', "'k;x':v;b:1", ["'k;x':v", 'b:1']],
      ['spaces around a quoted value', "k: 'a;b' ;c:1", ["k: 'a;b' ", 'c:1']],
    ])(
      'should only close a quote at the end of a part: %s',
      (_, str, expected) => {
        expect(splitAttribute(str)).toEqual(expected);
      },
    );

    it('should honor escapes with a custom separator', () => {
      expect(splitAttribute(String.raw`a\,b,c`, ',')).toEqual([
        String.raw`a\,b`,
        'c',
      ]);
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

    it.each([
      ['an empty value', 'key:', ['key', '']],
      ['an escaped colon in the key', String.raw`a\:b:c`, ['a:b', 'c']],
      ['an escaped colon in the value', String.raw`k:a\:b`, ['k', 'a:b']],
      ['an escaped separator', String.raw`k:a\;b`, ['k', 'a;b']],
      ['an escaped quote', String.raw`k:Men\'s`, ['k', "Men's"]],
      ['an escaped backslash', String.raw`k:a\\b`, ['k', 'a\\b']],
      [
        'a backslash before any character',
        String.raw`k:C:\temp`,
        ['k', 'C:temp'],
      ],
      ['escaped surrounding quotes', String.raw`k:\'q\'`, ['k', "'q'"]],
      ['an escaped quote inside quotes', String.raw`k:'it\'s'`, ['k', "it's"]],
      ['a quote after an escaped backslash', String.raw`k:'a\\'`, ['k', 'a\\']],
      ['a lone trailing backslash', 'k:a\\', ['k', 'a\\']],
      ['an escaped trailing space', 'k:x\\ ', ['k', 'x']],
      ['an apostrophe in a quoted value', "k:'it's'", ['k', "it's"]],
      ['a multi-line value', 'k:a\nb', ['k', 'a\nb']],
    ])('should read %s', (_, str, expected) => {
      expect(splitKeyVal(str)).toEqual(expected);
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

    it('should handle escaped values', () => {
      const config = parseInlineConfig(String.raw`name:Men\'s;path:a\;b`);
      expect(config).toEqual({ name: "Men's", path: 'a;b' });
    });
  });
});
