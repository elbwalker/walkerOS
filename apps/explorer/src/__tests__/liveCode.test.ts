/**
 * LiveCode component tests
 */

import { createLiveCode } from '../organisms/liveCode';

describe('LiveCode Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create container for component
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock attachShadow for testing
    if (!container.attachShadow) {
      container.attachShadow = jest.fn(() => {
        const shadow = document.createElement('div') as any;
        shadow.appendChild = jest.fn();
        shadow.querySelector = jest.fn();
        return shadow;
      });
    }
  });

  afterEach(() => {
    // Cleanup
    if (container && container.parentNode) {
      container.remove();
    }
  });

  test('should create LiveCode component', () => {
    const liveCode = createLiveCode(container, {
      input: 'return 1 + 1;',
      labelInput: 'Code',
      labelOutput: 'Result',
    });

    expect(liveCode).toBeDefined();
    expect(liveCode.getInput).toBeDefined();
    expect(liveCode.setInput).toBeDefined();
    expect(liveCode.execute).toBeDefined();
    expect(liveCode.destroy).toBeDefined();
  });

  test('should get and set input', () => {
    const liveCode = createLiveCode(container, {
      input: 'const x = 5;',
    });

    expect(liveCode.getInput()).toBe('const x = 5;');

    liveCode.setInput('const y = 10;');
    expect(liveCode.getInput()).toBe('const y = 10;');
  });

  test('should execute code with context', async () => {
    const liveCode = createLiveCode(container, {
      input: 'return add(2, 3);',
      context: {
        add: (a: number, b: number) => a + b,
      },
    });

    await liveCode.execute();
    // Result would be in the output box, but we'd need to access it
  });

  test('should handle destroy', () => {
    const liveCode = createLiveCode(container);

    expect(() => {
      liveCode.destroy();
    }).not.toThrow();
  });
});
