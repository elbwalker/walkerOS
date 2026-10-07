import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDesignTokens } from '../tokens';
import { fixture, type FixtureTokens } from './fixture';

const packageDir = resolve(__dirname, '../../..');
const realTokens = (): unknown => {
  const json: unknown = JSON.parse(
    readFileSync(resolve(packageDir, 'design/tokens.json'), 'utf8'),
  );
  return json;
};

it('accepts the fixture and design/tokens.json', () => {
  expect(parseDesignTokens(fixture()).colors).toHaveLength(7);
  expect(parseDesignTokens(realTokens()).colors.length).toBeGreaterThan(40);
});

it.each<readonly [string, (tokens: FixtureTokens) => void, string]>([
  [
    'a meta block',
    (t) => {
      t.meta = {};
    },
    'meta',
  ],
  [
    'an unknown top-level key',
    (t) => {
      t.extra = 1;
    },
    'extra',
  ],
  [
    'themes other than dark, light',
    (t) => {
      t.color.themes[1].id = 'dim';
    },
    'color.themes',
  ],
  [
    'an uppercase hex',
    (t) => {
      t.color.tokens[1].value = '#01B5E2';
    },
    'color.tokens[1].value',
  ],
  [
    'a var() colour',
    (t) => {
      t.color.tokens[1].value = 'var(--x)';
    },
    'color.tokens[1].value',
  ],
  [
    'an oklch() colour',
    (t) => {
      t.color.tokens[1].value = 'oklch(0.7 0.1 230)';
    },
    'color.tokens[1].value',
  ],
  [
    'an rgb() channel over 255',
    (t) => {
      t.color.tokens[5].value = 'rgba(41, 45, 620, 1)';
    },
    'color.tokens[5].value',
  ],
  [
    'an alias of a missing token',
    (t) => {
      t.color.tokens[3].value = '{nowhere}';
    },
    'color.tokens[3].value',
  ],
  [
    'an alias cycle',
    (t) => {
      t.color.tokens[1].value = '{focus}';
    },
    'color.tokens[1].value',
  ],
  [
    'a per-theme value without light',
    (t) => {
      t.color.tokens[0].value = { dark: '#111827' };
    },
    'color.tokens[0].value.light',
  ],
  [
    'a spacing value without a unit',
    (t) => {
      t.spacing.tokens[0].value = '24';
    },
    'spacing.tokens[0].value',
  ],
  [
    'a radius name outside radius-*',
    (t) => {
      t.radius.tokens[0].name = 'corner-md';
    },
    'radius.tokens[0].name',
  ],
  [
    'a fractional z-index',
    (t) => {
      t.zIndex.tokens[0].value = '5.5';
    },
    'zIndex.tokens[0].value',
  ],
  [
    'a shadow with var()',
    (t) => {
      t.shadow.tokens[0].value = '0 0 0 4px var(--x)';
    },
    'shadow.tokens[0].value',
  ],
  [
    'a font file',
    (t) => {
      t.type.fonts = [{ family: 'Geist', file: 'Geist.woff2' }];
    },
    'type.fonts',
  ],
  [
    'a family stack with a function',
    (t) => {
      t.type.families.sans = 'var(--x)';
    },
    'type.families.sans',
  ],
  [
    'a style family that does not exist',
    (t) => {
      t.type.groups[0].styles[2].family = 'serif';
    },
    'type.groups[0].styles[2].family',
  ],
  [
    'a style family inherited from Object.prototype',
    (t) => {
      t.type.groups[0].styles[2].family = 'constructor';
    },
    'type.groups[0].styles[2].family',
  ],
  [
    'a style named like a colour',
    (t) => {
      t.type.groups[0].styles[0].name = 'bg';
    },
    'type.groups[0].styles[0].name',
  ],
  [
    'a name declared in two families',
    (t) => {
      t.spacing.tokens[0].name = 'bg';
    },
    'spacing.tokens[0].name',
  ],
  [
    'a name with a trailing hyphen',
    (t) => {
      t.color.tokens[1].name = 'primary-';
    },
    'color.tokens[1].name',
  ],
  [
    'a name with a double hyphen',
    (t) => {
      t.spacing.tokens[0].name = 'gutter--x';
    },
    'spacing.tokens[0].name',
  ],
  [
    'a name longer than 64 characters',
    (t) => {
      t.spacing.tokens[0].name = 'g'.repeat(65);
    },
    'spacing.tokens[0].name',
  ],
  [
    'a colour whose constant is a reserved word',
    (t) => {
      t.color.tokens.push({ name: 'default', value: '#000000', usage: 'x' });
    },
    'color.tokens[7].name',
  ],
  [
    'two colours with one constant name',
    (t) => {
      t.color.tokens.push(
        { name: 'bg-2', value: '#000000', usage: 'x' },
        { name: 'bg2', value: '#000000', usage: 'x' },
      );
    },
    'color.tokens[8].name',
  ],
  [
    'a name inside a Tailwind theme namespace',
    (t) => {
      t.spacing.tokens[0].name = 'container-xl';
    },
    'spacing.tokens[0].name',
  ],
  [
    'a font family inside a narrower Tailwind namespace',
    (t) => {
      t.type.families['weight-bold'] = 'system-ui';
    },
    'type.families.weight-bold',
  ],
  [
    'a type style inside a Tailwind namespace nested under --text-*',
    (t) => {
      t.type.groups[0].styles[0].name = 'shadow-x';
    },
    'type.groups[0].styles[0].name',
  ],
  [
    'a colour in the type- prefix the type style variables own',
    (t) => {
      t.color.tokens[1].name = 'type-primary';
    },
    'color.tokens[1].name',
  ],
  [
    'a type style named like a key Tailwind keeps apart from --text-* sizes',
    (t) => {
      t.type.groups[0].styles[0].name = 'indent';
    },
    'type.groups[0].styles[0].name',
  ],
])('rejects %s with its path', (_label, mutate, path) => {
  const tokens = fixture();
  mutate(tokens);
  expect(() => parseDesignTokens(tokens)).toThrow(
    `design/tokens.json ${path}:`,
  );
});

it('says a name must start with a lowercase letter', () => {
  const tokens = fixture();
  tokens.spacing.tokens[0].name = '2-gutter';
  expect(() => parseDesignTokens(tokens)).toThrow(
    'spacing.tokens[0].name: "2-gutter" is not a token name: a name must start with a lowercase letter',
  );
});

it('says the type- prefix is reserved for the type style variables', () => {
  const tokens = fixture();
  tokens.zIndex.tokens[0].name = 'type-modal';
  expect(() => parseDesignTokens(tokens)).toThrow(
    'zIndex.tokens[0].name: "type-modal" starts with type-, reserved for the type style variables',
  );
});

it('z-index tokens ascend in declared order', () => {
  const values = parseDesignTokens(realTokens()).zIndex.map((token) =>
    Number(token.value),
  );
  expect(values).toEqual([...values].sort((a, b) => a - b));
  expect(new Set(values).size).toBe(values.length);
});
