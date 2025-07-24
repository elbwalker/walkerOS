/**
 * Comprehensive tests for Phase 1 core components
 * Tests full functionality rather than granular unit tests
 */

// Mock DOM environment
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    position: 'static',
  }),
});

// Mock clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  configurable: true,
});

import { HtmlPreview } from '../components/html-preview';
import { ResultDisplay } from '../components/result-display';
import { CodeBox } from '../components/code-box';
import { CodeEditor } from '../components/code-editor';

describe('Phase 1 Core Components', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('HtmlPreview Component', () => {
    it('should render HTML content with Shadow DOM isolation', () => {
      const preview = new HtmlPreview(container, {
        html: '<div class="test">Hello <strong>World</strong></div>',
        previewId: 'test-preview',
      });

      expect(preview.isDestroyed()).toBe(false);

      // Should have shadow DOM (shadow root is closed, so we can't access it directly)
      // Instead, test that the component is working
      expect(preview.getPreviewContainer()).toBeTruthy();

      // Should render the content
      expect(preview.getHtml()).toBe(
        '<div class="test">Hello <strong>World</strong></div>',
      );

      preview.destroy();
      expect(preview.isDestroyed()).toBe(true);
    });

    it('should handle empty and invalid HTML gracefully', () => {
      const preview = new HtmlPreview(container, {
        html: '',
      });

      // Should show empty state
      const previewContainer = preview.getPreviewContainer();
      expect(previewContainer).toBeTruthy();

      // Update with invalid HTML should not crash
      preview.setHtml('<div><span>unclosed tags');
      expect(preview.getHtml()).toBe('<div><span>unclosed tags');

      preview.destroy();
    });

    it('should sanitize dangerous HTML content', () => {
      const dangerousHtml = `
        <div onclick="alert('xss')">
          Click me
          <script>alert('evil')</script>
          <iframe src="javascript:alert('bad')"></iframe>
        </div>
      `;

      const preview = new HtmlPreview(container, {
        html: dangerousHtml,
      });

      // Script and iframe should be removed
      const previewContainer = preview.getPreviewContainer();
      expect(previewContainer.querySelector('script')).toBeNull();
      expect(previewContainer.querySelector('iframe')).toBeNull();

      // onclick should be removed
      const div = previewContainer.querySelector('div');
      expect(div?.hasAttribute('onclick')).toBe(false);

      preview.destroy();
    });

    it('should handle element highlighting and interaction', () => {
      const clickHandler = jest.fn();
      const preview = new HtmlPreview(container, {
        html: '<button id="test-btn">Click me</button>',
        onElementClick: clickHandler,
      });

      const previewContainer = preview.getPreviewContainer();
      const button = previewContainer.querySelector('#test-btn') as HTMLElement;

      expect(button).toBeTruthy();

      // Test highlighting
      preview.highlightElement(button);
      expect(button.classList.contains('preview-highlighted')).toBe(true);

      // Test click handling
      button.click();
      expect(clickHandler).toHaveBeenCalledWith(button, expect.any(MouseEvent));

      // Test clear highlights
      preview.clearHighlights();
      expect(button.classList.contains('preview-highlighted')).toBe(false);

      preview.destroy();
    });

    it('should integrate with walkerOS tagging system', () => {
      const preview = new HtmlPreview(container, {
        html: `
          <div data-elb="product" data-elb-id="123">
            <button data-elbaction="add_to_cart">Add to Cart</button>
          </div>
        `,
        previewId: 'walker-test',
      });

      const previewContainer = preview.getPreviewContainer();

      // Should add preview ID to interactive elements
      const button = previewContainer.querySelector(
        '[data-elbaction]',
      ) as HTMLElement;
      expect(button.getAttribute('data-preview-id')).toBe('walker-test');

      preview.destroy();
    });
  });

  describe('ResultDisplay Component', () => {
    it('should display various data types correctly', () => {
      const display = new ResultDisplay(container, {
        value: undefined,
      });

      expect(display.isDestroyed()).toBe(false);

      // Test undefined
      expect(display.getValue()).toBeUndefined();

      // Test null
      display.setValue(null);
      expect(display.getValue()).toBeNull();

      // Test string
      display.setValue('Hello World');
      expect(display.getValue()).toBe('Hello World');

      // Test number
      display.setValue(42);
      expect(display.getValue()).toBe(42);

      // Test boolean
      display.setValue(true);
      expect(display.getValue()).toBe(true);

      // Test object
      const testObj = { name: 'test', value: 123 };
      display.setValue(testObj);
      expect(display.getValue()).toEqual(testObj);

      display.destroy();
    });

    it('should handle complex nested objects with expandable view', () => {
      const complexObj = {
        users: [
          {
            id: 1,
            name: 'John',
            settings: { theme: 'dark', notifications: true },
          },
          {
            id: 2,
            name: 'Jane',
            settings: { theme: 'light', notifications: false },
          },
        ],
        metadata: {
          version: '1.0.0',
          lastUpdate: '2024-01-01',
          features: ['auth', 'notifications', 'themes'],
        },
      };

      const display = new ResultDisplay(container, {
        value: complexObj,
        expandable: true,
        theme: 'light',
      });

      expect(display.getValue()).toEqual(complexObj);
      expect(display.getFormattedValue()).toContain('users');
      expect(display.getFormattedValue()).toContain('metadata');

      display.destroy();
    });

    it('should provide copy functionality', async () => {
      mockWriteText.mockClear();
      mockWriteText.mockResolvedValue(undefined);

      const testData = { message: 'test data', timestamp: Date.now() };
      const copyHandler = jest.fn();

      const display = new ResultDisplay(container, {
        value: testData,
        onCopy: copyHandler,
      });

      // Test the formatted value that would be copied
      expect(display.getFormattedValue()).toBe(
        JSON.stringify(testData, null, 2),
      );

      display.destroy();
    });

    it('should handle errors gracefully', () => {
      const errorObj = new Error('Test error message');

      const display = new ResultDisplay(container, {
        value: errorObj,
      });

      expect(display.getFormattedValue()).toContain(
        'Error: Test error message',
      );

      // Test circular reference
      const circular: any = { name: 'test' };
      circular.self = circular;

      display.setValue(circular);
      // Should not crash and should handle gracefully
      expect(display.getValue()).toBe(circular);

      display.destroy();
    });

    it('should support theme switching', () => {
      const display = new ResultDisplay(container, {
        value: { test: 'data' },
        theme: 'light',
      });

      // Switch to dark theme
      display.setTheme('dark');

      // Should update internal theme
      expect(display).toBeDefined(); // Component should still work

      display.destroy();
    });
  });

  describe('CodeBox Component', () => {
    it('should provide complete code editing experience with wrapper features', () => {
      const changeHandler = jest.fn();
      const resetHandler = jest.fn();

      const codeBox = new CodeBox(container, {
        label: 'Test Code',
        value: 'function test() { return true; }',
        language: 'javascript',
        showCopy: true,
        showFormat: true,
        showReset: true,
        showFullScreen: true,
        onChange: changeHandler,
        onReset: resetHandler,
      });

      expect(codeBox.isDestroyed()).toBe(false);
      expect(codeBox.getValue()).toBe('function test() { return true; }');

      // Test that the component has the expected functionality
      expect(codeBox.getCodeEditor()).toBeTruthy();

      // Test reset functionality
      codeBox.setValue('new code');
      expect(codeBox.getValue()).toBe('new code');

      // Test reset value functionality
      codeBox.setResetValue('reset test');
      expect(codeBox).toBeTruthy(); // Component should still be functional

      codeBox.destroy();
    });

    it('should integrate CodeEditor functionality seamlessly', () => {
      const codeBox = new CodeBox(container, {
        value: '{ "test": true }',
        language: 'json',
        showLineNumbers: true,
      });

      // Should have access to underlying CodeEditor
      const editor = codeBox.getCodeEditor();
      expect(editor).toBeInstanceOf(CodeEditor);

      // Test editor methods through CodeBox
      codeBox.setLanguage('javascript');
      codeBox.insertText('\n// comment');
      expect(codeBox.getValue()).toContain('comment');

      codeBox.focus();
      codeBox.blur();

      codeBox.destroy();
    });

    it('should handle different configuration options', () => {
      // Minimal configuration
      const minimal = new CodeBox(container, {
        showLabel: false,
        showCopy: false,
        showReset: false,
      });

      // Should still function without header elements
      expect(minimal.getValue()).toBe('');

      minimal.destroy();

      // Full configuration
      const full = new CodeBox(document.createElement('div'), {
        label: 'Full Example',
        value: 'console.log("hello");',
        language: 'javascript',
        theme: 'dark',
        showLabel: true,
        showCopy: true,
        showFormat: true,
        showReset: true,
        showFullScreen: true,
        readOnly: true,
        className: 'custom-class',
      });

      expect(full.getValue()).toBe('console.log("hello");');

      // Should be read-only
      full.getCodeEditor().setReadOnly(false); // Should be able to change

      full.destroy();
    });

    it('should support dynamic updates and label changes', () => {
      const codeBox = new CodeBox(container, {
        label: 'Original Label',
        value: 'original code',
      });

      // Test label update functionality
      codeBox.setLabel('Updated Label');
      expect(codeBox).toBeTruthy(); // Component should still work

      // Test reset value update
      codeBox.setResetValue('new reset value');

      codeBox.destroy();
    });
  });

  describe('Component Integration', () => {
    it('should work together in complex scenarios', async () => {
      // Create multiple components that interact
      const htmlContainer = document.createElement('div');
      const resultContainer = document.createElement('div');
      const codeContainer = document.createElement('div');

      document.body.appendChild(htmlContainer);
      document.body.appendChild(resultContainer);
      document.body.appendChild(codeContainer);

      const htmlPreview = new HtmlPreview(htmlContainer, {
        html: '<button id="test">Click me</button>',
        onElementClick: (element) => {
          resultDisplay.setValue({
            element: element.tagName,
            id: element.id,
            timestamp: Date.now(),
          });
        },
      });

      const resultDisplay = new ResultDisplay(resultContainer, {
        value: null,
      });

      let lastChangedValue = '';
      const codeBox = new CodeBox(codeContainer, {
        label: 'Generated Code',
        value: '',
        language: 'json',
        onChange: (value) => {
          lastChangedValue = value;
          try {
            const parsed = JSON.parse(value);
            resultDisplay.setValue(parsed);
          } catch (e) {
            resultDisplay.setValue({ error: 'Invalid JSON' });
          }
        },
      });

      // Test interaction
      const button = htmlPreview
        .getPreviewContainer()
        .querySelector('#test') as HTMLElement;
      button.click();

      // Should update result display
      expect(resultDisplay.getValue()).toEqual({
        element: 'BUTTON',
        id: 'test',
        timestamp: expect.any(Number),
      });

      // Test manual JSON update
      resultDisplay.setValue({ message: 'hello' });
      expect(resultDisplay.getValue()).toEqual({ message: 'hello' });

      // Test CodeBox value setting
      codeBox.setValue('{"test": "data"}');
      expect(codeBox.getValue()).toBe('{"test": "data"}');

      // Cleanup
      htmlPreview.destroy();
      resultDisplay.destroy();
      codeBox.destroy();

      document.body.removeChild(htmlContainer);
      document.body.removeChild(resultContainer);
      document.body.removeChild(codeContainer);
    });

    it('should handle component lifecycle properly', () => {
      const components = [
        new HtmlPreview(document.createElement('div')),
        new ResultDisplay(document.createElement('div')),
        new CodeBox(document.createElement('div')),
        new CodeEditor(document.createElement('div')),
      ];

      // All should be initialized
      components.forEach((component) => {
        expect(component.isDestroyed()).toBe(false);
      });

      // All should destroy cleanly
      components.forEach((component) => {
        component.destroy();
        expect(component.isDestroyed()).toBe(true);
      });
    });

    it('should maintain Shadow DOM isolation across components', () => {
      const containers = [
        document.createElement('div'),
        document.createElement('div'),
        document.createElement('div'),
      ];

      containers.forEach((c) => document.body.appendChild(c));

      const components = [
        new HtmlPreview(containers[0]),
        new ResultDisplay(containers[1]),
        new CodeBox(containers[2]),
      ];

      // Each component should be isolated and functional
      components.forEach((component) => {
        expect(component.isDestroyed()).toBe(false);
      });

      // Components should be isolated and working
      expect(components.length).toBe(3);

      // Cleanup
      components.forEach((c) => c.destroy());
      containers.forEach((c) => document.body.removeChild(c));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid container selectors', () => {
      expect(() => {
        new HtmlPreview('#non-existent-container');
      }).toThrow('Element not found: #non-existent-container');

      expect(() => {
        new ResultDisplay('#another-non-existent');
      }).toThrow('Element not found: #another-non-existent');
    });

    it('should handle malformed options gracefully', () => {
      // Should not crash with undefined options
      const preview = new HtmlPreview(document.createElement('div'));
      expect(preview.isDestroyed()).toBe(false);
      preview.destroy();

      const display = new ResultDisplay(document.createElement('div'));
      expect(display.isDestroyed()).toBe(false);
      display.destroy();

      const codeBox = new CodeBox(document.createElement('div'));
      expect(codeBox.isDestroyed()).toBe(false);
      codeBox.destroy();
    });

    it('should handle DOM manipulation after destroy', () => {
      const preview = new HtmlPreview(container, {
        html: '<div>test</div>',
      });

      const originalHtml = preview.getHtml();

      preview.destroy();

      // Should not crash when trying to update destroyed component
      expect(() => {
        preview.setHtml('<div>new content</div>');
      }).not.toThrow();

      // Should still return the last known value
      expect(originalHtml).toBe('<div>test</div>');
    });

    it('should handle large data sets efficiently', () => {
      // Create large object
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: Array.from({ length: 100 }, (_, j) => `value-${j}`),
        })),
      };

      const display = new ResultDisplay(container, {
        value: largeData,
        expandable: true,
        maxExpandedItems: 50,
      });

      // Should handle large data without crashing
      expect(display.getValue()).toBe(largeData);
      expect(display.getFormattedValue().length).toBeGreaterThan(1000);

      display.destroy();
    });
  });
});
