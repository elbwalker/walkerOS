import { isVisible } from '..';

describe('isVisible', () => {
  const w = window;

  test('isVisible', () => {
    const innerHeight = w.innerHeight;
    w.innerHeight = 100; // Create a small window

    const x = 25,
      y = 25,
      width = 50,
      height = 50,
      top = 10,
      right = 25,
      bottom = 25,
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
    document.elementFromPoint = () => {
      return elem;
    };
    document.body.appendChild(elem);

    expect(isVisible(elem)).toBeTruthy();

    elem.style.display = 'none';
    expect(isVisible(elem)).toBeFalsy();
    elem.style.display = 'block';
    expect(isVisible(elem)).toBeTruthy();

    elem.style.visibility = 'hidden';
    expect(isVisible(elem)).toBeFalsy();
    elem.style.visibility = 'visible';
    expect(isVisible(elem)).toBeTruthy();

    elem.style.opacity = '0.0';
    expect(isVisible(elem)).toBeFalsy();
    elem.style.opacity = '1';
    expect(isVisible(elem)).toBeTruthy();

    Object.defineProperty(elem, 'clientHeight', {
      value: 250,
      writable: true,
    });
    expect(isVisible(elem)).toBeTruthy();

    w.innerHeight = innerHeight;
  });

  test('zero width/height elements should not be visible', () => {
    // Test zero width
    const elemZeroWidth = document.createElement('div');
    Object.defineProperty(elemZeroWidth, 'offsetWidth', { value: 0 });
    Object.defineProperty(elemZeroWidth, 'offsetHeight', { value: 50 });
    elemZeroWidth.getBoundingClientRect = () =>
      ({ x: 10, y: 10, width: 0, height: 50 }) as DOMRect;

    expect(isVisible(elemZeroWidth)).toBeFalsy();

    // Test zero height
    const elemZeroHeight = document.createElement('div');
    Object.defineProperty(elemZeroHeight, 'offsetWidth', { value: 50 });
    Object.defineProperty(elemZeroHeight, 'offsetHeight', { value: 0 });
    elemZeroHeight.getBoundingClientRect = () =>
      ({ x: 10, y: 10, width: 50, height: 0 }) as DOMRect;

    expect(isVisible(elemZeroHeight)).toBeFalsy();
  });

  test('elements outside viewport bounds should not be visible', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    window.innerWidth = 100;
    window.innerHeight = 100;

    const elem = document.createElement('div');
    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });

    // Element too far right (center x > viewport width)
    elem.getBoundingClientRect = () =>
      ({
        x: 150,
        y: 25,
        width: 50,
        height: 50,
      }) as DOMRect;
    expect(isVisible(elem)).toBeFalsy();

    // Element too far down (center y > viewport height)
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 150,
        width: 50,
        height: 50,
      }) as DOMRect;
    expect(isVisible(elem)).toBeFalsy();

    // Element too far left (center x < 0)
    elem.getBoundingClientRect = () =>
      ({
        x: -100,
        y: 25,
        width: 50,
        height: 50,
      }) as DOMRect;
    expect(isVisible(elem)).toBeFalsy();

    // Element too far up (center y < 0)
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: -100,
        width: 50,
        height: 50,
      }) as DOMRect;
    expect(isVisible(elem)).toBeFalsy();

    window.innerWidth = originalInnerWidth;
    window.innerHeight = originalInnerHeight;
  });

  test('large elements visibility logic', () => {
    const originalInnerHeight = window.innerHeight;
    window.innerHeight = 100; // Small viewport

    const elem = document.createElement('div');
    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });

    // Large element entirely above viewport center - should be invisible
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: -80,
        width: 50,
        height: 120, // top=-80, bottom=40, viewport center=50
      }) as DOMRect;

    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => null;

    expect(isVisible(elem)).toBeFalsy();

    // Large element entirely below viewport center - should be invisible
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 80,
        width: 50,
        height: 150, // top=80 > center=50, bottom=230 > viewport=100
      }) as DOMRect;
    expect(isVisible(elem)).toBeFalsy();

    // Large element visible that spans viewport center - should call elementFromPoint at viewport center
    const largeElem = document.createElement('div');
    Object.defineProperty(largeElem, 'offsetWidth', { value: 50 });
    Object.defineProperty(largeElem, 'offsetHeight', { value: 120 }); // Make it larger than viewport
    largeElem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 20,
        width: 50,
        height: 120, // top=20, bottom=140, spans center=50
      }) as DOMRect;

    // Mock elementFromPoint to return the element when called at viewport center
    document.elementFromPoint = jest.fn(() => largeElem);

    expect(isVisible(largeElem)).toBeTruthy();
    expect(document.elementFromPoint).toHaveBeenCalledWith(50, 50); // center x, viewport center y

    document.elementFromPoint = originalElementFromPoint;
    window.innerHeight = originalInnerHeight;
  });

  test('element not found by elementFromPoint should return false', () => {
    const elem = document.createElement('div');
    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 25,
        width: 50,
        height: 50,
      }) as DOMRect;

    // Mock elementFromPoint to return null
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => null;

    expect(isVisible(elem)).toBeFalsy();

    document.elementFromPoint = originalElementFromPoint;
  });

  test('element with overlaying elements', () => {
    const elem = document.createElement('div');
    const overlay = document.createElement('div');
    const parent = document.createElement('div');

    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 25,
        width: 50,
        height: 50,
      }) as DOMRect;

    // Mock elementFromPoint to return overlay element
    const originalElementFromPoint = document.elementFromPoint;

    // Test when element is found directly
    document.elementFromPoint = () => elem;
    expect(isVisible(elem)).toBeTruthy();

    // Test when unrelated element is found - should be invisible
    document.elementFromPoint = () => overlay;
    expect(isVisible(elem)).toBeFalsy();

    // Test parent chain traversal - elem should be ancestor of what elementFromPoint returns
    // Set up chain: parent -> elem -> overlay (so overlay.parentElement === elem)
    Object.defineProperty(overlay, 'parentElement', {
      value: elem,
      writable: true,
    });
    Object.defineProperty(elem, 'parentElement', {
      value: parent,
      writable: true,
    });
    Object.defineProperty(parent, 'parentElement', {
      value: null,
      writable: true,
    });

    // When elementFromPoint returns overlay, it walks: overlay -> elem (match!) -> return true
    expect(isVisible(elem)).toBeTruthy();

    document.elementFromPoint = originalElementFromPoint;
  });
});
