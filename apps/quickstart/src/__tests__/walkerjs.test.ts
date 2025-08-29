import { setupWalkerJS, initWalkerJS } from '../walkerjs/basic';

describe('Walker.js Examples', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('creates walker.js script element', () => {
    const script = setupWalkerJS();
    expect(script.src).toContain('walker.js');
    expect(script.async).toBe(true);
  });

  it('initializes walker.js without errors', () => {
    expect(() => initWalkerJS()).not.toThrow();
  });
});
