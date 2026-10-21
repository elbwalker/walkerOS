// The drift proof of check-platform.mjs: every kind of drift the check exists
// for is reported. `npm run check:platform` runs it before the check itself.
import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import base from '../eslint/index.mjs';
import neutral from '../eslint/neutral.mjs';
import {
  check,
  eslintProblems,
  presetProblems,
  readTsconfig,
  tsconfigProblems,
} from './check-platform.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const preset = (name) =>
  readTsconfig(join(root, 'packages/config/tsconfig', name));
const tsconfig = (rel) => readTsconfig(join(root, rel, 'tsconfig.json'));
const core = tsconfig('packages/core');
const webCore = tsconfig('packages/web/core');
const gtag = tsconfig('packages/web/destinations/gtag');

const withOptions = (config, options) => ({
  ...config,
  options: { ...config.options, ...options },
});
const withLib = (config, ...files) =>
  withOptions(config, { lib: [...config.options.lib, ...files] });
const lints = (rel, overrideConfig) =>
  new ESLint({
    cwd: join(root, rel),
    overrideConfigFile: true,
    overrideConfig,
  });

const reports = (problems, text) =>
  assert.ok(
    problems.some((problem) => problem.includes(text)),
    `expected "${text}" in ${JSON.stringify(problems)}`,
  );

test('the presets and packages as they are report nothing', () => {
  for (const name of ['base.json', 'node.json', 'web.json'])
    assert.deepEqual(presetProblems(name, preset(name)), []);
  assert.deepEqual(tsconfigProblems('packages/core', 'neutral', core), []);
  assert.deepEqual(tsconfigProblems('packages/web/core', 'web', webCore), []);
});

test('a preset that loads the DOM, drops types or raises the ES lib', () => {
  reports(
    presetProblems('base.json', withLib(preset('base.json'), 'lib.dom.d.ts')),
    'lib has dom',
  );
  reports(
    presetProblems(
      'node.json',
      withOptions(preset('node.json'), { types: undefined }),
    ),
    'types is undefined',
  );
  reports(
    presetProblems('web.json', withLib(preset('web.json'), 'lib.es2022.d.ts')),
    'past es2020',
  );
});

test('a package on the wrong preset', () => {
  const raw = {
    ...webCore.raw,
    extends: '@walkeros/config/tsconfig/base.json',
  };
  reports(
    tsconfigProblems('packages/web/core', 'web', { ...webCore, raw }),
    'not @walkeros/config/tsconfig/web.json',
  );
});

test('a package lib that gains or drops the DOM or raises the ES lib', () => {
  reports(
    tsconfigProblems('packages/core', 'neutral', withLib(core, 'lib.dom.d.ts')),
    'lib has dom',
  );
  reports(
    tsconfigProblems(
      'packages/web/core',
      'web',
      withOptions(webCore, { lib: ['lib.es2020.d.ts'] }),
    ),
    'lib drops dom',
  );
  reports(
    tsconfigProblems(
      'packages/core',
      'neutral',
      withLib(core, 'lib.es2022.d.ts'),
    ),
    'past es2020',
  );
  reports(
    tsconfigProblems(
      'packages/web/core',
      'web',
      withLib(webCore, 'lib.es2021.string.d.ts'),
    ),
    'past es2020',
  );
  const explorer = tsconfig('apps/explorer');
  assert.deepEqual(
    tsconfigProblems(
      'apps/explorer',
      'web',
      withLib(explorer, 'lib.es2022.d.ts'),
    ),
    [],
  );
});

test('package types that are unset, not allowlisted or short of the preset', () => {
  reports(
    tsconfigProblems(
      'packages/core',
      'neutral',
      withOptions(core, { types: undefined }),
    ),
    'sets no types',
  );
  reports(
    tsconfigProblems(
      'packages/web/destinations/gtag',
      'web',
      withOptions(gtag, { types: [...gtag.options.types, 'jsdom'] }),
    ),
    'adds jsdom',
  );
  reports(
    tsconfigProblems(
      'packages/core',
      'neutral',
      withOptions(core, { types: ['node'] }),
    ),
    'misses jest',
  );
});

test('a package linted without its platform preset', async () => {
  const problems = await eslintProblems(
    'packages/core',
    'neutral',
    lints('packages/core', base),
    ['src/index.ts', 'src/__tests__/flow.test.ts'],
  );
  reports(problems, 'no-restricted-globals misses');
  reports(problems, 'no-restricted-imports misses');
  reports(problems, 'triple-slash-reference');
  reports(problems, 'misses jsdom');
});

test('a ban lifted outside the named exemptions, or wider than named', async () => {
  const unnamed = [
    ...neutral,
    { files: ['src/flow.ts'], rules: { 'no-restricted-globals': 'off' } },
  ];
  reports(
    await eslintProblems(
      'packages/collector',
      'neutral',
      lints('packages/collector', unnamed),
      ['src/flow.ts'],
    ),
    'misses window',
  );
  const widened = [
    ...neutral,
    {
      files: ['src/dev/boundary.ts'],
      rules: { 'no-restricted-globals': 'off' },
    },
  ];
  reports(
    await eslintProblems(
      'packages/collector',
      'neutral',
      lints('packages/collector', widened),
      ['src/dev/boundary.ts'],
    ),
    'misses window',
  );
});

test('a package that declares no platform', async () => {
  const scratch = mkdtempSync(join(tmpdir(), 'check-platform-'));
  after(() => rmSync(scratch, { recursive: true, force: true }));
  mkdirSync(join(scratch, 'packages/config/tsconfig'), { recursive: true });
  for (const name of ['base.json', 'node.json', 'web.json'])
    copyFileSync(
      join(root, 'packages/config/tsconfig', name),
      join(scratch, 'packages/config/tsconfig', name),
    );
  mkdirSync(join(scratch, 'packages/new-step'));
  mkdirSync(join(scratch, 'apps'));
  writeFileSync(
    join(scratch, 'packages/new-step/package.json'),
    '{ "name": "@walkeros/new-step" }',
  );
  writeFileSync(join(scratch, 'packages/new-step/tsconfig.json'), '{}');
  const { problems } = await check(scratch);
  assert.deepEqual(problems, [
    'packages/new-step: no platform; set walkerOS.platform or add it to the table in check-platform.mjs',
  ]);
});
