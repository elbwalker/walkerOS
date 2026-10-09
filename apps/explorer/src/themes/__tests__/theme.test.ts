import type { editor } from 'monaco-editor';
import * as design from '../../design';
import { ELB_THEME_DARK, registerTheme } from '..';

// Every colour a design constant holds, in both themes; type styles hold none.
const designColors = new Set(
  Object.values(design).flatMap((value) =>
    typeof value === 'string'
      ? [value]
      : 'dark' in value
        ? [value.dark, value.light]
        : [],
  ),
);

// Monaco rules take hex without the leading `#`.
const withHash = (color: string): string =>
  color.startsWith('#') ? color : `#${color}`;

function registeredThemes() {
  const defineTheme = jest.fn(
    (name: string, theme: editor.IStandaloneThemeData) => ({ name, theme }),
  );
  registerTheme({ editor: { defineTheme } });
  return defineTheme.mock.calls;
}

it('registers one dark theme for every editor', () => {
  const calls = registeredThemes();

  expect(calls).toHaveLength(1);
  const [name, theme] = calls[0];
  expect(name).toBe(ELB_THEME_DARK);
  expect(theme.base).toBe('vs-dark');
});

it('builds every theme colour from the design constants', () => {
  const [[, theme]] = registeredThemes();
  const colors = [
    ...theme.rules.flatMap((rule) =>
      rule.foreground === undefined ? [] : [rule.foreground],
    ),
    ...Object.values(theme.colors),
  ];

  expect(colors.length).toBeGreaterThan(0);
  expect(colors.filter((color) => !designColors.has(withHash(color)))).toEqual(
    [],
  );
});
