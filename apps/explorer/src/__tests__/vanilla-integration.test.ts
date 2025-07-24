/**
 * Integration tests for the vanilla JS explorer implementation
 */

// Mock DOM environment
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    position: 'static',
  }),
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
});

import {
  createDestination,
  createMockDestination,
  CodeEditor,
  DestinationInit,
  DestinationPush,
  ExplorerStateManager,
  highlightSyntax,
} from '../index';

describe('Vanilla JS Explorer Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('createDestination', () => {
    it('should create a destination instance with proper API', () => {
      const mockDestination = createMockDestination();
      const destination = createDestination(mockDestination, {
        initialConfig: { test: true },
        fnName: 'testDestination',
      });

      expect(destination).toHaveProperty('id');
      expect(destination).toHaveProperty('createInit');
      expect(destination).toHaveProperty('createPush');
      expect(destination).toHaveProperty('updateConfig');
      expect(destination).toHaveProperty('getState');
      expect(destination).toHaveProperty('destroy');

      // Test state
      const state = destination.getState();
      expect(state).toBeDefined();
      expect(state?.config).toEqual({ test: true });
      expect(state?.fnName).toBe('testDestination');

      destination.destroy();
    });

    it('should create functional init and push components', () => {
      const mockDestination = createMockDestination();
      const destination = createDestination(mockDestination);

      // Create init component
      const initContainer = document.createElement('div');
      const initComponent = destination.createInit(initContainer, {
        custom: { apiKey: 'test-key' },
        showOutput: true,
      });

      expect(initComponent).toBeInstanceOf(DestinationInit);
      expect(initComponent.isDestroyed()).toBe(false);

      // Create push component
      const pushContainer = document.createElement('div');
      const pushComponent = destination.createPush(pushContainer, {
        event: { event: 'test', data: { id: '123' } },
        showOutput: true,
      });

      expect(pushComponent).toBeInstanceOf(DestinationPush);
      expect(pushComponent.isDestroyed()).toBe(false);

      // Cleanup
      initComponent.destroy();
      pushComponent.destroy();
      destination.destroy();
    });
  });

  describe('CodeEditor', () => {
    it('should create a functional code editor', () => {
      const editor = new CodeEditor(container, {
        language: 'json',
        value: '{\n  "test": true\n}',
        showCopyButton: true,
        showFormatButton: true,
      });

      expect(editor.isDestroyed()).toBe(false);

      // Test API methods
      expect(editor.getValue()).toBe('{\n  "test": true\n}');

      editor.setValue('{"updated": true}');
      expect(editor.getValue()).toBe('{"updated": true}');

      editor.destroy();
      expect(editor.isDestroyed()).toBe(true);
    });

    it('should handle different languages', () => {
      const editor = new CodeEditor(container, {
        language: 'javascript',
        value: 'function test() { return true; }',
      });

      expect(editor.getValue()).toBe('function test() { return true; }');

      editor.setLanguage('html');
      // Language should be updated (though highlighting happens on next update)

      editor.destroy();
    });
  });

  describe('ExplorerStateManager', () => {
    it('should manage destination state correctly', async () => {
      const stateManager = new ExplorerStateManager();
      const mockDestination = createMockDestination(
        (config) => `Init with ${JSON.stringify(config)}`,
        (event) => `Push ${event.event}`,
      );

      const id = stateManager.createDestination('test-id', mockDestination, {
        test: true,
      });

      expect(id).toBe('test-id');
      const state = stateManager.getState('test-id');
      expect(state).toBeDefined();
      expect(state?.config).toEqual({ test: true });

      // Test config update
      stateManager.updateConfig('test-id', { updated: true });
      const updatedState = stateManager.getState('test-id');
      expect(updatedState?.config).toEqual({ updated: true });

      // Test event push
      const result = await stateManager.pushEvent('test-id', {
        event: 'test event',
        data: { id: '123' },
        timestamp: Date.now(),
      });
      expect(result).toBe('Push test event');

      stateManager.cleanup('test-id');
      expect(stateManager.getState('test-id')).toBeUndefined();
    });

    it('should handle subscriptions correctly', () => {
      const stateManager = new ExplorerStateManager();
      const mockDestination = createMockDestination();

      let callbackCalled = false;
      const callback = () => {
        callbackCalled = true;
      };

      const id = stateManager.createDestination('test-id', mockDestination);
      const unsubscribe = stateManager.subscribe('test-id', callback);

      // Update config should trigger callback
      stateManager.updateConfig('test-id', { test: true });
      expect(callbackCalled).toBe(true);

      // Unsubscribe should work
      callbackCalled = false;
      unsubscribe();
      stateManager.updateConfig('test-id', { test: false });
      expect(callbackCalled).toBe(false);

      stateManager.cleanup('test-id');
    });
  });

  describe('highlightSyntax', () => {
    it('should highlight JavaScript code', () => {
      const code = 'function test() { return true; }';
      const result = highlightSyntax(code, { language: 'javascript' });

      expect(result.highlighted).toContain('span');
      expect(result.highlighted).toContain('function');
      expect(result.lineCount).toBe(1);
    });

    it('should highlight JSON code', () => {
      const code = '{\n  "test": true,\n  "number": 42\n}';
      const result = highlightSyntax(code, { language: 'json' });

      expect(result.highlighted).toContain('span');
      expect(result.lineCount).toBe(4);
    });

    it('should highlight HTML code', () => {
      const code = '<div class="test">Hello World</div>';
      const result = highlightSyntax(code, { language: 'html' });

      expect(result.highlighted).toContain('span');
      expect(result.highlighted).toContain('div');
      expect(result.lineCount).toBe(1);
    });

    it('should add line numbers when requested', () => {
      const code = 'line 1\nline 2\nline 3';
      const result = highlightSyntax(code, {
        language: 'javascript',
        showLineNumbers: true,
      });

      expect(result.highlighted).toContain('syntax-line-number');
      expect(result.lineCount).toBe(3);
    });
  });

  describe('Component Lifecycle', () => {
    it('should properly initialize and destroy components', () => {
      const mockDestination = createMockDestination();
      const destination = createDestination(mockDestination);

      const initComponent = destination.createInit(container);
      expect(initComponent.isDestroyed()).toBe(false);

      initComponent.destroy();
      expect(initComponent.isDestroyed()).toBe(true);

      destination.destroy();
    });

    it('should handle container as string selector', () => {
      container.id = 'test-container';

      const editor = new CodeEditor('#test-container', {
        value: 'test code',
      });

      expect(editor.getValue()).toBe('test code');
      editor.destroy();
    });

    it('should throw error for invalid selector', () => {
      expect(() => {
        new CodeEditor('#non-existent-container');
      }).toThrow('Element not found: #non-existent-container');
    });
  });

  describe('Error Handling', () => {
    it('should handle destination errors gracefully', async () => {
      const errorDestination = {
        init: () => {
          throw new Error('Init failed');
        },
        push: () => {
          throw new Error('Push failed');
        },
      };

      const stateManager = new ExplorerStateManager();
      const id = stateManager.createDestination('error-test', errorDestination);

      const state = stateManager.getState('error-test');
      expect(state?.error).toBeDefined();
      expect(state?.error?.message).toBe('Init failed');

      try {
        await stateManager.pushEvent('error-test', {
          event: 'test',
          data: {},
          timestamp: Date.now(),
        });
      } catch (error) {
        expect((error as Error).message).toBe('Push failed');
      }

      stateManager.cleanup('error-test');
    });

    it('should handle invalid JSON in editors', () => {
      const mockDestination = createMockDestination();
      const destination = createDestination(mockDestination);
      const initComponent = destination.createInit(container);

      // Test with invalid JSON
      const config = initComponent.getConfig();
      expect(config).toEqual({});

      initComponent.destroy();
      destination.destroy();
    });
  });
});

describe('Standalone Explorer', () => {
  it('should export createExplorer function', async () => {
    const { createExplorer } = await import('../standalone');

    expect(createExplorer).toBeDefined();
    expect(typeof createExplorer).toBe('function');
  });
});
