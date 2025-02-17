import { getLanguage, getTimezone, getScreenSize } from '../../web';

describe('Browser', () => {
  const window = {
    innerWidth: 1337,
    innerHeight: 420,
    screen: {
      width: 1337,
      height: 420,
    },
  } as Window;
  const navigator = {
    language: 'de-DE',
  } as Navigator;

  test('getLanguage', () => {
    const language = getLanguage(navigator);
    expect(language).toBe('de-DE');
  });

  test('getTimezone', () => {
    const timezone = getTimezone();
    expect(timezone).toBeDefined();
  });

  test('getScreenSize', () => {
    const screenSize = getScreenSize(window);
    expect(screenSize).toBe('1337x420');
  });
});
