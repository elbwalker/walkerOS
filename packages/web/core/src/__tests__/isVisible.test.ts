import {
  isVisible,
  deepElementFromPoint,
  composedAncestors,
  shadowHostsAbove,
} from '..';

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

    expect(isVisible(elem, window, document)).toBeTruthy();

    elem.style.display = 'none';
    expect(isVisible(elem, window, document)).toBeFalsy();
    elem.style.display = 'block';
    expect(isVisible(elem, window, document)).toBeTruthy();

    elem.style.visibility = 'hidden';
    expect(isVisible(elem, window, document)).toBeFalsy();
    elem.style.visibility = 'visible';
    expect(isVisible(elem, window, document)).toBeTruthy();

    elem.style.opacity = '0.0';
    expect(isVisible(elem, window, document)).toBeFalsy();
    elem.style.opacity = '1';
    expect(isVisible(elem, window, document)).toBeTruthy();

    Object.defineProperty(elem, 'clientHeight', {
      value: 250,
      writable: true,
    });
    expect(isVisible(elem, window, document)).toBeTruthy();

    w.innerHeight = innerHeight;
  });

  test('zero width/height elements should not be visible', () => {
    // Test zero width
    const elemZeroWidth = document.createElement('div');
    Object.defineProperty(elemZeroWidth, 'offsetWidth', { value: 0 });
    Object.defineProperty(elemZeroWidth, 'offsetHeight', { value: 50 });
    elemZeroWidth.getBoundingClientRect = () =>
      ({ x: 10, y: 10, width: 0, height: 50 }) as DOMRect;

    expect(isVisible(elemZeroWidth, window, document)).toBeFalsy();

    // Test zero height
    const elemZeroHeight = document.createElement('div');
    Object.defineProperty(elemZeroHeight, 'offsetWidth', { value: 50 });
    Object.defineProperty(elemZeroHeight, 'offsetHeight', { value: 0 });
    elemZeroHeight.getBoundingClientRect = () =>
      ({ x: 10, y: 10, width: 50, height: 0 }) as DOMRect;

    expect(isVisible(elemZeroHeight, window, document)).toBeFalsy();
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
    expect(isVisible(elem, window, document)).toBeFalsy();

    // Element too far down (center y > viewport height)
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 150,
        width: 50,
        height: 50,
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

    // Element too far left (center x < 0)
    elem.getBoundingClientRect = () =>
      ({
        x: -100,
        y: 25,
        width: 50,
        height: 50,
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

    // Element too far up (center y < 0)
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: -100,
        width: 50,
        height: 50,
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

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

    expect(isVisible(elem, window, document)).toBeFalsy();

    // Large element entirely below viewport center - should be invisible
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 80,
        width: 50,
        height: 150, // top=80 > center=50, bottom=230 > viewport=100
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

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

    expect(isVisible(largeElem, window, document)).toBeTruthy();
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

    expect(isVisible(elem, window, document)).toBeFalsy();

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
    expect(isVisible(elem, window, document)).toBeTruthy();

    // Test when unrelated element is found - should be invisible
    document.elementFromPoint = () => overlay;
    expect(isVisible(elem, window, document)).toBeFalsy();

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
    expect(isVisible(elem, window, document)).toBeTruthy();

    document.elementFromPoint = originalElementFromPoint;
  });
});

function mockGeometry(el: HTMLElement): void {
  Object.defineProperty(el, 'offsetWidth', { value: 50, writable: true });
  Object.defineProperty(el, 'offsetHeight', { value: 50, writable: true });
  el.style.display = 'block';
  el.style.visibility = 'visible';
  el.getBoundingClientRect = jest.fn(() => ({
    x: 25,
    y: 25,
    width: 50,
    height: 50,
    top: 25,
    right: 75,
    bottom: 75,
    left: 25,
    toJSON: jest.fn,
  }));
}

describe('deepElementFromPoint', () => {
  const originalElementFromPoint = document.elementFromPoint;

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
  });

  test('pierces an open shadow boundary to the inner element', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => inner);

    expect(deepElementFromPoint(document, 0, 0)).toBe(inner);
  });

  test('stops at the host for a closed shadow root', () => {
    const host = document.createElement('div');
    host.attachShadow({ mode: 'closed' });

    document.elementFromPoint = () => host;

    expect(deepElementFromPoint(document, 0, 0)).toBe(host);
  });

  test('returns null when the point hits nothing', () => {
    document.elementFromPoint = () => null;

    expect(deepElementFromPoint(document, 0, 0)).toBeNull();
  });

  test('breaks the loop when the inner hit equals the host', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => host);

    expect(deepElementFromPoint(document, 0, 0)).toBe(host);
  });
});

describe('composedAncestors', () => {
  test('walks light-DOM parents', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);

    expect(composedAncestors(child, window)).toEqual([parent]);
  });

  test('crosses an open shadow boundary to the host and light ancestors', () => {
    const lightParent = document.createElement('div');
    const host = document.createElement('div');
    lightParent.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    expect(composedAncestors(inner, window)).toEqual([host, lightParent]);
  });

  test('crosses a closed shadow boundary to the host', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    expect(composedAncestors(inner, window)).toEqual([host]);
  });
});

describe('shadowHostsAbove', () => {
  test('returns empty for a light-DOM element and excludes plain ancestors', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);

    expect(shadowHostsAbove(child, window)).toEqual([]);
  });

  test('returns the host for a closed-shadow element', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    expect(shadowHostsAbove(inner, window)).toEqual([host]);
  });

  test('returns nested hosts inner-to-outer', () => {
    const outerHost = document.createElement('div');
    const outerRoot = outerHost.attachShadow({ mode: 'open' });
    const innerHost = document.createElement('div');
    outerRoot.appendChild(innerHost);
    const innerRoot = innerHost.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    innerRoot.appendChild(target);

    expect(shadowHostsAbove(target, window)).toEqual([innerHost, outerHost]);
  });
});

describe('isVisible shadow DOM occlusion', () => {
  const originalElementFromPoint = document.elementFromPoint;

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
  });

  test('light exact hit is visible', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mockGeometry(target);

    document.elementFromPoint = () => target;

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('light unrelated overlay is not visible', () => {
    const target = document.createElement('div');
    const overlay = document.createElement('div');
    document.body.appendChild(target);
    document.body.appendChild(overlay);
    mockGeometry(target);

    document.elementFromPoint = () => overlay;

    expect(isVisible(target, window, document)).toBe(false);
  });

  test('light descendant hit is visible', () => {
    const target = document.createElement('div');
    const child = document.createElement('div');
    target.appendChild(child);
    document.body.appendChild(target);
    mockGeometry(target);

    document.elementFromPoint = () => child;

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('open-shadow inner hit equal to the target is visible', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    shadow.appendChild(target);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => target);

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('open-shadow occluder that is not in either chain is not visible', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    const occluder = document.createElement('div');
    shadow.appendChild(target);
    shadow.appendChild(occluder);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => occluder);

    expect(isVisible(target, window, document)).toBe(false);
  });

  test('closed-shadow host hit resolves the target as visible', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const target = document.createElement('div');
    shadow.appendChild(target);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('light plain ancestor hit does not loosen occlusion', () => {
    const ancestor = document.createElement('div');
    const target = document.createElement('div');
    ancestor.appendChild(target);
    document.body.appendChild(ancestor);
    mockGeometry(target);

    document.elementFromPoint = () => ancestor;

    expect(isVisible(target, window, document)).toBe(false);
  });

  test('open-shadow wrapper ancestor within the same root preserves occlusion', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    const target = document.createElement('div');
    wrapper.appendChild(target);
    shadow.appendChild(wrapper);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => wrapper);

    expect(isVisible(target, window, document)).toBe(false);
  });
});
