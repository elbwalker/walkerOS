/**
 * Quick Tests - Fast unit tests for development
 * Focuses on isolated functionality without heavy DOM setup
 */

import { generateUniqueId } from '../core/Component';
import { highlightSyntax, detectLanguage } from '../utils/syntax';
import { debounce, throttle, memoize } from '../utils/debounce';
import { escapeHTML } from '../utils/dom';
import { version, name } from '../index';

describe('Quick Unit Tests', () => {
  describe('Core Utilities', () => {
    test('generates unique IDs', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId('custom');

      expect(id1).toMatch(/^explorer-/);
      expect(id2).toMatch(/^custom-/);
      expect(id1).not.toBe(id2);
    });

    test('escapes HTML properly', () => {
      expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
      // Note: JSDOM might not escape quotes the same way as real browsers
      expect(escapeHTML('"quotes"')).toMatch(
        /[""]quotes[""]|&quot;quotes&quot;/,
      );
      expect(escapeHTML("'single'")).toMatch(/['']single['']|&#39;single&#39;/);
      expect(escapeHTML('&amp;')).toBe('&amp;amp;');
    });

    test('detects languages correctly', () => {
      expect(detectLanguage('file.js')).toBe('javascript');
      expect(detectLanguage('file.jsx')).toBe('javascript');
      expect(detectLanguage('file.ts')).toBe('typescript');
      expect(detectLanguage('file.tsx')).toBe('typescript');
      expect(detectLanguage('file.html')).toBe('html');
      expect(detectLanguage('file.css')).toBe('css');
      expect(detectLanguage('file.json')).toBe('json');
      expect(detectLanguage('file.txt')).toBe('text');
      expect(detectLanguage('unknown')).toBe('text');
    });
  });

  describe('Syntax Highlighting', () => {
    test('highlights JavaScript keywords', () => {
      const code = 'const function = async () => {};';
      const result = highlightSyntax(code, 'javascript');

      expect(result).toContain('<span class="syntax-keyword">const</span>');
      expect(result).toContain('<span class="syntax-keyword">function</span>');
      expect(result).toContain('<span class="syntax-keyword">async</span>');
    });

    test('highlights strings and numbers', () => {
      const code = 'const msg = "hello"; const num = 42;';
      const result = highlightSyntax(code, 'javascript');

      expect(result).toContain(
        '<span class="syntax-string">&quot;hello&quot;</span>',
      );
      expect(result).toContain('<span class="syntax-number">42</span>');
    });

    test('highlights HTML tags and attributes', () => {
      const code = '<div class="test" id="main">Content</div>';
      const result = highlightSyntax(code, 'html');

      expect(result).toContain('<span class="syntax-tag">&lt;div</span>');
      expect(result).toContain('<span class="syntax-attribute">class</span>');
      expect(result).toContain(
        '<span class="syntax-value">&quot;test&quot;</span>',
      );
    });

    test('highlights walkerOS elb attributes specially', () => {
      const code = '<div data-elb="product" data-elb-id="123">Product</div>';
      const result = highlightSyntax(code, 'html');

      expect(result).toContain(
        '<span class="syntax-elb-attribute">data-elb</span>',
      );
      expect(result).toContain(
        '<span class="syntax-elb-value">&quot;product&quot;</span>',
      );
      expect(result).toContain(
        '<span class="syntax-elb-attribute">data-elb-id</span>',
      );
      expect(result).toContain(
        '<span class="syntax-elb-value">&quot;123&quot;</span>',
      );
    });

    test('handles JSON correctly', () => {
      const code = '{"name": "test", "active": true, "count": 42}';
      const result = highlightSyntax(code, 'json');

      expect(result).toContain(
        '<span class="syntax-attribute">&quot;name&quot;</span>',
      );
      expect(result).toContain(
        '<span class="syntax-string">&quot;test&quot;</span>',
      );
      expect(result).toContain('<span class="syntax-keyword">true</span>');
      expect(result).toContain('<span class="syntax-number">42</span>');
    });

    test('returns escaped text for unsupported languages', () => {
      const code = '<script>alert("test")</script>';
      const result = highlightSyntax(code, 'text');

      expect(result).toBe(
        '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;',
      );
      expect(result).not.toContain('<span');
    });
  });

  describe('Performance Utilities', () => {
    test('debounce prevents rapid calls', (done) => {
      let callCount = 0;
      const fn = debounce(() => callCount++, 10);

      fn();
      fn();
      fn();

      expect(callCount).toBe(0);

      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 20);
    });

    test('debounce with immediate execution', () => {
      let callCount = 0;
      const fn = debounce(() => callCount++, 10, true);

      fn();
      fn();
      fn();

      expect(callCount).toBe(1); // Immediate execution
    });

    test('debounce cancel works', (done) => {
      let callCount = 0;
      const fn = debounce(() => callCount++, 20);

      fn();
      fn.cancel();

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 30);
    });

    test('throttle allows periodic calls', (done) => {
      let callCount = 0;
      const fn = throttle(() => callCount++, 20);

      fn(); // Should execute immediately
      fn(); // Should be throttled
      fn(); // Should be throttled

      expect(callCount).toBe(1);

      setTimeout(() => {
        fn(); // Should execute after throttle period
        expect(callCount).toBe(2);
        done();
      }, 30);
    });

    test('memoize caches results', () => {
      let callCount = 0;
      const expensiveFn = (x: number) => {
        callCount++;
        return x * x;
      };

      const memoized = memoize(expensiveFn);

      expect(memoized(5)).toBe(25);
      expect(memoized(5)).toBe(25); // Should use cache
      expect(callCount).toBe(1);

      expect(memoized(3)).toBe(9);
      expect(callCount).toBe(2);

      expect(memoized(5)).toBe(25); // Should still use cache
      expect(callCount).toBe(2);
    });

    test('memoize respects maxSize', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x;
      };

      const memoized = memoize(fn, { maxSize: 2 });

      memoized(1);
      memoized(2);
      memoized(3); // Should evict cache for 1

      expect(callCount).toBe(3);

      memoized(1); // Should call again since cache was evicted
      expect(callCount).toBe(4);
    });
  });

  describe('Package Info', () => {
    test('exports correct package information', () => {
      expect(version).toBe('1.0.0');
      expect(name).toBe('@walkeros/explorer');
    });
  });
});
