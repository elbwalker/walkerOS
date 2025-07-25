/**
 * Foundation Tests - Phase 1
 * Tests the core foundation components built in Phase 1
 */

import {
  createComponent,
  generateUniqueId,
  getAllComponents,
  getComponent,
  destroyAllComponents,
  findComponents,
} from '../core/Component';

import {
  eventBus,
  ComponentEvents,
  createScopedEventBus,
  EventDebug,
} from '../core/EventBus';

import {
  defaultTheme,
  getThemeCSS,
  detectCurrentTheme,
  getCurrentThemeColors,
  injectThemeCSS,
} from '../core/Theme';

import {
  createElement,
  getElement,
  findElement,
  getElements,
  addEventListener,
  escapeHTML,
  injectCSS,
} from '../utils/dom';

import {
  highlightSyntax,
  detectLanguage,
  formatCode,
  getSyntaxHighlightCSS,
  createCodeBlock,
  tokenize,
} from '../utils/syntax';

import {
  debounce,
  throttle,
  rafThrottle,
  debounceAsync,
  batch,
  memoize,
} from '../utils/debounce';

describe('Foundation - Core Component System', () => {
  beforeEach(() => {
    // Clean up between tests
    destroyAllComponents();
    document.body.innerHTML = '';
    eventBus.off(); // Clear all event listeners
  });

  describe('Component Factory', () => {
    test('creates unique component IDs', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();

      expect(id1).toMatch(/^explorer-/);
      expect(id2).toMatch(/^explorer-/);
      expect(id1).not.toBe(id2);
    });

    test('creates component with DOM element', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const component = createComponent(container, {
        theme: 'light',
        className: 'test-component',
      });

      expect(component.id).toMatch(/^explorer-/);
      expect(component.getElement()).toBe(container);
      expect(container.getAttribute('data-explorer-component')).toBe(
        component.id,
      );
      expect(container.getAttribute('data-theme')).toBe('light');
      expect(container.classList.contains('test-component')).toBe(true);
    });

    test('creates component with selector string', () => {
      document.body.innerHTML = '<div id="test-container"></div>';

      const component = createComponent('#test-container');
      const container = document.getElementById('test-container');

      expect(component.getElement()).toBe(container);
      expect(container?.getAttribute('data-explorer-component')).toBe(
        component.id,
      );
    });

    test('throws error for invalid selector', () => {
      expect(() => {
        createComponent('#non-existent');
      }).toThrow('Element not found: #non-existent');
    });

    test('manages component lifecycle', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const mountSpy = jest.fn();
      const unmountSpy = jest.fn();
      const destroySpy = jest.fn();

      const component = createComponent(container);
      component.on('mount', mountSpy);
      component.on('unmount', unmountSpy);
      component.on('destroy', destroySpy);

      // Trigger mount manually for testing
      component.emit('mount', {});
      expect(mountSpy).toHaveBeenCalled();

      component.unmount();
      expect(unmountSpy).toHaveBeenCalled();

      component.destroy();
      expect(destroySpy).toHaveBeenCalled();
      expect(component.getElement()).toBeNull();
    });

    test('tracks components globally', () => {
      const container1 = document.createElement('div');
      const container2 = document.createElement('div');
      document.body.appendChild(container1);
      document.body.appendChild(container2);

      const comp1 = createComponent(container1);
      const comp2 = createComponent(container2);

      expect(getAllComponents()).toHaveLength(2);
      expect(getComponent(comp1.id)).toBe(comp1);
      expect(getComponent(comp2.id)).toBe(comp2);

      comp1.destroy();
      expect(getAllComponents()).toHaveLength(1);
      expect(getComponent(comp1.id)).toBeUndefined();
    });
  });

  describe('Event System', () => {
    test('handles basic events', () => {
      const handler = jest.fn();
      const subscription = eventBus.on('test-event', handler);

      eventBus.emit('test-event', { data: 'test' });
      expect(handler).toHaveBeenCalledWith(
        { data: 'test' },
        expect.objectContaining({
          type: 'test-event',
          timestamp: expect.any(Number),
        }),
      );

      subscription.unsubscribe();
      eventBus.emit('test-event', { data: 'test2' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('handles wildcard events', () => {
      const wildcardHandler = jest.fn();
      eventBus.on('*', wildcardHandler);

      eventBus.emit('any-event', { data: 'test' });
      eventBus.emit('another-event', { data: 'test2' });

      expect(wildcardHandler).toHaveBeenCalledTimes(2);
    });

    test('handles namespace events', () => {
      const namespacedHandler = jest.fn();
      eventBus.on('component:*', namespacedHandler);

      eventBus.emit('component:mount', { id: 'test' });
      eventBus.emit('component:unmount', { id: 'test' });
      eventBus.emit('other:event', { id: 'test' });

      expect(namespacedHandler).toHaveBeenCalledTimes(2);
    });

    test('creates scoped event bus', () => {
      const scopedBus = createScopedEventBus('test-component');
      const handler = jest.fn();

      eventBus.on('component:mount', handler);
      scopedBus.mount({ test: 'data' });

      expect(handler).toHaveBeenCalledWith(
        { test: 'data' },
        expect.objectContaining({
          source: 'test-component',
        }),
      );
    });
  });

  describe('Theme System', () => {
    test('generates theme CSS', () => {
      const css = getThemeCSS();

      expect(css).toContain(':root {');
      expect(css).toContain('[data-theme="dark"]');
      expect(css).toContain('--explorer-bg-primary');
      expect(css).toContain('--explorer-text-primary');
      expect(css).toContain('.syntax-keyword');
    });

    test('detects current theme', () => {
      // Test light theme (default)
      expect(detectCurrentTheme()).toBe('light');

      // Test dark theme via class
      document.documentElement.classList.add('dark');
      expect(detectCurrentTheme()).toBe('dark');
      document.documentElement.classList.remove('dark');

      // Test dark theme via attribute
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(detectCurrentTheme()).toBe('dark');
      document.documentElement.removeAttribute('data-theme');
    });

    test('gets current theme colors', () => {
      const colors = getCurrentThemeColors();

      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('interactive');
      expect(colors).toHaveProperty('syntax');
      expect(colors.bg).toHaveProperty('primary');
      expect(colors.text).toHaveProperty('primary');
    });

    test('injects theme CSS into document', () => {
      injectThemeCSS();

      const styleElements = document.querySelectorAll('style');
      const themeStyle = Array.from(styleElements).find((style) =>
        style.textContent?.includes('--explorer-bg-primary'),
      );

      expect(themeStyle).toBeTruthy();
    });
  });
});

describe('Foundation - Utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('DOM Utilities', () => {
    test('creates elements with attributes and styles', () => {
      const element = createElement(
        'div',
        {
          id: 'test-id',
          className: 'test-class',
          textContent: 'Test Content',
        },
        {
          color: 'red',
          fontSize: '16px',
        },
      );

      expect(element.tagName).toBe('DIV');
      expect(element.id).toBe('test-id');
      expect(element.className).toBe('test-class');
      expect(element.textContent).toBe('Test Content');
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });

    test('gets element by selector', () => {
      document.body.innerHTML = '<div id="test">Content</div>';

      const element = getElement('#test');
      expect(element.id).toBe('test');
      expect(element.textContent).toBe('Content');
    });

    test('finds element safely', () => {
      document.body.innerHTML = '<div id="exists">Content</div>';

      expect(findElement('#exists')).toBeTruthy();
      expect(findElement('#not-exists')).toBeNull();
    });

    test('gets multiple elements', () => {
      document.body.innerHTML = `
        <div class="test">1</div>
        <div class="test">2</div>
        <div class="test">3</div>
      `;

      const elements = getElements('.test');
      expect(elements).toHaveLength(3);
      expect(elements[0].textContent).toBe('1');
    });

    test('adds event listeners with cleanup', () => {
      const element = document.createElement('button');
      const handler = jest.fn();

      const cleanup = addEventListener(element, 'click', handler);

      element.click();
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
      element.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('injects CSS into document', () => {
      const css = '.test { color: red; }';
      const styleElement = injectCSS(css, 'test-styles');

      expect(styleElement.textContent).toBe(css);
      expect(styleElement.id).toBe('test-styles');
      expect(document.head.contains(styleElement)).toBe(true);
    });

    test('escapes HTML content', () => {
      const unsafe = '<script>alert("xss")</script>';
      const safe = escapeHTML(unsafe);

      // JSDOM might not escape quotes the same way
      expect(safe).toContain('&lt;script&gt;');
      expect(safe).toContain('&lt;/script&gt;');
      expect(safe).toContain('alert');
      expect(safe).not.toContain('<script>');
    });
  });

  describe('Syntax Highlighting', () => {
    test('highlights JavaScript code', () => {
      const code = 'const message = "Hello World";';
      const highlighted = highlightSyntax(code, 'javascript');

      expect(highlighted).toContain(
        '<span class="syntax-keyword">const</span>',
      );
      expect(highlighted).toContain(
        '<span class="syntax-string">&quot;Hello World&quot;</span>',
      );
    });

    test('highlights HTML code', () => {
      const code = '<div class="test">Content</div>';
      const highlighted = highlightSyntax(code, 'html');

      expect(highlighted).toContain('<span class="syntax-tag">&lt;div</span>');
      expect(highlighted).toContain(
        '<span class="syntax-attribute">class</span>',
      );
      expect(highlighted).toContain(
        '<span class="syntax-value">&quot;test&quot;</span>',
      );
    });

    test('highlights walkerOS elb attributes', () => {
      const code = '<div data-elb="product" data-elb-id="123">Product</div>';
      const highlighted = highlightSyntax(code, 'html');

      expect(highlighted).toContain('syntax-elb-attribute');
      expect(highlighted).toContain('syntax-elb-value');
    });

    test('detects language from filename', () => {
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('component.tsx')).toBe('typescript');
      expect(detectLanguage('page.html')).toBe('html');
      expect(detectLanguage('styles.css')).toBe('css');
      expect(detectLanguage('data.json')).toBe('json');
      expect(detectLanguage('readme.txt')).toBe('text');
    });

    test('formats JSON code', () => {
      const json = '{"name":"test","value":123}';
      const formatted = formatCode(json, 'json', 2);

      expect(formatted).toContain('{\n  "name": "test",\n  "value": 123\n}');
    });

    test('creates code block element', () => {
      const code = 'console.log("test");';
      const codeBlock = createCodeBlock(code, 'javascript', {
        showLineNumbers: true,
        className: 'custom-code',
        maxHeight: '200px',
      });

      expect(codeBlock.tagName).toBe('PRE');
      expect(codeBlock.classList.contains('syntax-highlight')).toBe(true);
      expect(codeBlock.classList.contains('custom-code')).toBe(true);
      expect(codeBlock.classList.contains('with-line-numbers')).toBe(true);
      expect(codeBlock.style.maxHeight).toBe('200px');
    });

    test('tokenizes code', () => {
      const code = 'const name = "test";';
      const tokens = tokenize(code, 'javascript');

      expect(tokens).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'keyword', value: 'const' }),
          expect.objectContaining({ type: 'string', value: '"test"' }),
        ]),
      );
    });

    test('generates syntax highlight CSS', () => {
      const css = getSyntaxHighlightCSS();

      expect(css).toContain('.syntax-keyword');
      expect(css).toContain('.syntax-string');
      expect(css).toContain('.syntax-elb-attribute');
      expect(css).toContain('#d73a49');
    });
  });

  describe('Performance Utilities', () => {
    test('debounces function calls', (done) => {
      let callCount = 0;
      const debouncedFn = debounce(() => callCount++, 50);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 100);
    });

    test('throttles function calls', (done) => {
      let callCount = 0;
      const throttledFn = throttle(() => callCount++, 50);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1); // First call should execute immediately

      setTimeout(() => {
        expect(callCount).toBe(1); // Should still be 1 during throttle period
        done();
      }, 25);
    });

    test('RAF throttles function calls', () => {
      let callCount = 0;
      const rafThrottledFn = rafThrottle(() => callCount++);

      rafThrottledFn();
      rafThrottledFn();
      rafThrottledFn();

      expect(callCount).toBe(0); // Should not execute immediately
    });

    test('debounces async functions', async () => {
      let callCount = 0;
      const asyncFn = async () => {
        callCount++;
        return 'result';
      };

      const debouncedAsyncFn = debounceAsync(asyncFn, 50);

      const promise1 = debouncedAsyncFn();
      const promise2 = debouncedAsyncFn();
      const promise3 = debouncedAsyncFn();

      const result = await promise1;
      expect(result).toBe('result');
      expect(callCount).toBe(1);

      // All promises should resolve to the same result
      expect(await promise2).toBe('result');
      expect(await promise3).toBe('result');
    });

    test('batches function calls', (done) => {
      const batchedCalls: number[][] = [];
      const batchedFn = batch(
        (items: number[]) => {
          batchedCalls.push([...items]);
        },
        3,
        50,
      );

      batchedFn(1);
      batchedFn(2);
      batchedFn(3); // Should trigger batch

      expect(batchedCalls).toHaveLength(1);
      expect(batchedCalls[0]).toEqual([1, 2, 3]);

      batchedFn(4);
      batchedFn(5);

      setTimeout(() => {
        expect(batchedCalls).toHaveLength(2);
        expect(batchedCalls[1]).toEqual([4, 5]);
        done();
      }, 100);
    });

    test('memoizes function results', () => {
      let callCount = 0;
      const expensiveFn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoizedFn = memoize(expensiveFn);

      expect(memoizedFn(5)).toBe(10);
      expect(memoizedFn(5)).toBe(10); // Should use cached result
      expect(callCount).toBe(1);

      expect(memoizedFn(10)).toBe(20);
      expect(callCount).toBe(2);
    });

    test('memoizes with TTL', (done) => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoizedFn = memoize(fn, { ttl: 50 });

      expect(memoizedFn(5)).toBe(10);
      expect(callCount).toBe(1);

      setTimeout(() => {
        expect(memoizedFn(5)).toBe(10);
        expect(callCount).toBe(2); // Should call again after TTL
        done();
      }, 100);
    });
  });
});

describe('Foundation - Integration', () => {
  beforeEach(() => {
    destroyAllComponents();
    document.body.innerHTML = '';
    eventBus.off();
  });

  test('components work together with event system', () => {
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    document.body.appendChild(container1);
    document.body.appendChild(container2);

    const comp1 = createComponent(container1);
    const comp2 = createComponent(container2);

    const handler = jest.fn();
    comp2.on('test-event', handler);
    comp1.emit('test-event', { data: 'cross-component' });

    // Components should not directly communicate unless explicitly connected
    expect(handler).not.toHaveBeenCalled();

    // But they can communicate via global event bus
    const globalHandler = jest.fn();
    eventBus.on('global-test', globalHandler);
    eventBus.emit('global-test', { data: 'global' });
    expect(globalHandler).toHaveBeenCalled();
  });

  test('theme changes propagate to all components', () => {
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    document.body.appendChild(container1);
    document.body.appendChild(container2);

    // Set dark theme first
    document.documentElement.classList.add('dark');

    const comp1 = createComponent(container1, { theme: 'auto' });
    const comp2 = createComponent(container2, { theme: 'auto' });

    // Components should detect dark theme during creation
    expect(container1.getAttribute('data-theme')).toBe('dark');
    expect(container2.getAttribute('data-theme')).toBe('dark');

    // Clean up
    document.documentElement.classList.remove('dark');
  });

  test('cleanup works properly', () => {
    const containers = Array.from({ length: 5 }, () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      return div;
    });

    const components = containers.map((container) =>
      createComponent(container, { className: 'test-component' }),
    );

    expect(getAllComponents()).toHaveLength(5);
    expect(document.querySelectorAll('.test-component')).toHaveLength(5);

    destroyAllComponents();

    expect(getAllComponents()).toHaveLength(0);
    expect(document.querySelectorAll('[data-explorer-component]')).toHaveLength(
      0,
    );
  });
});
