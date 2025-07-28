import { isVisible } from '@walkeros/web-core';

describe('isVisible', () => {
  const w = window;

  test('isVisible detects visible element', () => {
    const innerHeight = w.innerHeight;
    w.innerHeight = 100; // Create a small window

    const x = 25,
      y = 25,
      width = 50,
      height = 50,
      top = 10,
      right = 75,
      bottom = 60,
      left = 25;

    // Create a mocked element
    const elem = document.createElement('div');
    Object.defineProperty(elem, 'offsetWidth', {
      value: width,
      writable: true,
    });
    Object.defineProperty(elem, 'offsetHeight', {
      value: height,
      writable: true,
    });
    Object.defineProperty(elem, 'clientHeight', {
      value: height,
      writable: true,
    });
    elem.getBoundingClientRect = jest.fn(() => ({
      x,
      y,
      width,
      height,
      top,
      right,
      bottom,
      left,
      toJSON: jest.fn,
    }));
    document.elementFromPoint = jest.fn(() => elem);
    document.body.appendChild(elem);

    expect(isVisible(elem)).toBeTruthy();

    // Restore original window height
    w.innerHeight = innerHeight;
  });

  test('isVisible detects element outside viewport', () => {
    const elem = document.createElement('div');

    // Element positioned outside viewport
    elem.getBoundingClientRect = jest.fn(() => ({
      x: -100,
      y: -100,
      width: 50,
      height: 50,
      top: -100,
      right: -50,
      bottom: -50,
      left: -100,
      toJSON: jest.fn,
    }));

    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });
    Object.defineProperty(elem, 'clientHeight', { value: 50 });

    expect(isVisible(elem)).toBeFalsy();
  });

  test('isVisible handles zero-sized elements', () => {
    const elem = document.createElement('div');

    // Zero-sized element
    elem.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: jest.fn,
    }));

    Object.defineProperty(elem, 'offsetWidth', { value: 0 });
    Object.defineProperty(elem, 'offsetHeight', { value: 0 });
    Object.defineProperty(elem, 'clientHeight', { value: 0 });

    expect(isVisible(elem)).toBeFalsy();
  });

  test('isVisible handles element covered by another element', () => {
    const elem = document.createElement('div');
    const coveringElem = document.createElement('div');

    elem.getBoundingClientRect = jest.fn(() => ({
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      top: 10,
      right: 60,
      bottom: 60,
      left: 10,
      toJSON: jest.fn,
    }));

    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });
    Object.defineProperty(elem, 'clientHeight', { value: 50 });

    // Mock elementFromPoint to return a different element (covering element)
    document.elementFromPoint = jest.fn(() => coveringElem);

    expect(isVisible(elem)).toBeFalsy();
  });

  test('isVisible handles element at viewport edge', () => {
    const elem = document.createElement('div');

    // Element at the very edge of viewport
    elem.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: jest.fn,
    }));

    Object.defineProperty(elem, 'offsetWidth', { value: 100 });
    Object.defineProperty(elem, 'offsetHeight', { value: 100 });
    Object.defineProperty(elem, 'clientHeight', { value: 100 });

    document.elementFromPoint = jest.fn(() => elem);

    expect(isVisible(elem)).toBeTruthy();
  });

  test('isVisible handles hidden element (display: none)', () => {
    const elem = document.createElement('div');
    elem.style.display = 'none';

    // Hidden elements typically have zero dimensions
    elem.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: jest.fn,
    }));

    Object.defineProperty(elem, 'offsetWidth', { value: 0 });
    Object.defineProperty(elem, 'offsetHeight', { value: 0 });
    Object.defineProperty(elem, 'clientHeight', { value: 0 });

    expect(isVisible(elem)).toBeFalsy();
  });

  test('isVisible handles partially visible element', () => {
    const elem = document.createElement('div');

    // Element partially visible (top part cut off)
    elem.getBoundingClientRect = jest.fn(() => ({
      x: 10,
      y: -25, // Partially above viewport
      width: 100,
      height: 100,
      top: -25,
      right: 110,
      bottom: 75,
      left: 10,
      toJSON: jest.fn,
    }));

    Object.defineProperty(elem, 'offsetWidth', { value: 100 });
    Object.defineProperty(elem, 'offsetHeight', { value: 100 });
    Object.defineProperty(elem, 'clientHeight', { value: 100 });

    document.elementFromPoint = jest.fn(() => elem);

    // Should still be considered visible if any part is in viewport
    expect(isVisible(elem)).toBeTruthy();
  });

  test('isVisible works with actual DOM elements', () => {
    // Test with real DOM elements in jsdom
    const div = document.createElement('div');
    div.style.width = '100px';
    div.style.height = '100px';
    div.style.position = 'absolute';
    div.style.top = '10px';
    div.style.left = '10px';

    document.body.appendChild(div);

    // Note: In jsdom, getBoundingClientRect may return zeros
    // but the function should still handle it gracefully
    expect(() => isVisible(div)).not.toThrow();

    document.body.removeChild(div);
  });
});
