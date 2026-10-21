import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import neutral from '../neutral.mjs';
import node from '../node.mjs';
import web from '../web.mjs';

const linter = new Linter({ cwd: '/pkg' });
const source = 'src/index.ts';
const test = 'src/__tests__/index.test.ts';
// The rule reads the comments before the first statement.
const domReference = '/// <reference lib="dom" />\nexport {};';

// The rules a preset reports for one file. Under jest the presets' default
// import of the parser is empty, so the test names the parser, as the rule
// tests do.
const hits = (config, code, file = source) =>
  linter
    .verify(code, [...config, { languageOptions: { parser: tsParser } }], {
      filename: `/pkg/${file}`,
    })
    .map((message) => message.ruleId);

describe('neutral preset', () => {
  it.each([
    ["Buffer.from('x');", 'no-restricted-globals'],
    ["import fs from 'node:fs';", 'no-restricted-imports'],
    ["localStorage.getItem('x');", 'no-restricted-globals'],
    ['globalThis.document;', 'no-restricted-globals'],
    ["Reflect.get(globalThis, 'history');", 'no-restricted-globals'],
    [domReference, '@typescript-eslint/triple-slash-reference'],
  ])('flags %s', (code, rule) => {
    expect(hits(neutral, code)).toContain(rule);
  });

  it('ignores a local named process', () => {
    expect(
      hits(
        neutral,
        'const process = { env: {} };\nexport const env = process.env;',
      ),
    ).toEqual([]);
  });

  it('flags jsdom in a test file', () => {
    expect(hits(neutral, "import { JSDOM } from 'jsdom';", test)).toContain(
      'no-restricted-imports',
    );
  });
});

describe('web preset', () => {
  it('flags process.env', () => {
    expect(hits(web, 'export const env = process.env;')).toContain(
      'no-restricted-globals',
    );
  });
});

describe('node preset', () => {
  it('flags localStorage', () => {
    expect(hits(node, "localStorage.getItem('x');")).toContain(
      'no-restricted-globals',
    );
  });

  it.each([source, test])('flags a DOM lib reference in %s', (file) => {
    expect(hits(node, domReference, file)).toContain(
      '@typescript-eslint/triple-slash-reference',
    );
  });
});
