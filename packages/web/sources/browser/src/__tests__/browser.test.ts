import { getLanguage, getTimezone, getScreenSize } from '@walkeros/web-core';
import { examples } from '../dev';

describe('Browser Utilities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getLanguage returns navigator language', () => {
    jest.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE');
    const language = getLanguage(navigator);
    expect(language).toBe('de-DE');
  });

  test('getTimezone returns current timezone', () => {
    const timezone = getTimezone();
    expect(timezone).toBeDefined();
    expect(typeof timezone).toBe('string');
  });

  test('getScreenSize returns formatted screen dimensions', () => {
    jest.spyOn(window.screen, 'width', 'get').mockReturnValue(1337);
    jest.spyOn(window.screen, 'height', 'get').mockReturnValue(420);
    const screenSize = getScreenSize(window);
    expect(screenSize).toBe('1337x420');
  });

  test('getScreenSize with actual window object', () => {
    // Test with real window object in jsdom environment
    const screenSize = getScreenSize(window);
    expect(screenSize).toBeDefined();
    expect(typeof screenSize).toBe('string');
    expect(screenSize).toMatch(/^\d+x\d+$/); // Should match format like "1024x768"
  });

  test('browser detection functions work in jsdom environment', () => {
    // These should work without errors in jsdom
    expect(() => getLanguage(navigator)).not.toThrow();
    expect(() => getTimezone()).not.toThrow();
    expect(() => getScreenSize(window)).not.toThrow();
  });
});
