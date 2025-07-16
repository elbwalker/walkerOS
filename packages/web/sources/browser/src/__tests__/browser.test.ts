import { getLanguage, getTimezone, getScreenSize } from '@walkerOS/web-core';

describe('Browser Utilities', () => {
  const mockWindow = {
    innerWidth: 1337,
    innerHeight: 420,
    screen: {
      width: 1337,
      height: 420,
    },
  } as Window;

  const mockNavigator = {
    language: 'de-DE',
  } as Navigator;

  test('getLanguage returns navigator language', () => {
    const language = getLanguage(mockNavigator);
    expect(language).toBe('de-DE');
  });

  test('getTimezone returns current timezone', () => {
    const timezone = getTimezone();
    expect(timezone).toBeDefined();
    expect(typeof timezone).toBe('string');
  });

  test('getScreenSize returns formatted screen dimensions', () => {
    const screenSize = getScreenSize(mockWindow);
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
