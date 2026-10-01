// Per-export settings schemas: validate checks a step against the schema of
// the export it imports, resolved like the bundler does (`import`, then
// `bundle.packages[pkg].imports[0]`, then the default export).

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Flow } from '@walkeros/core';
import { validate } from '../../../commands/validate/index.js';
import type { ValidateResult } from '../../../commands/validate/types.js';
import {
  selectSettingsSchema,
  type PackageSchema,
  type SettingsSelection,
} from '../../../commands/validate/validators/settings.js';

const MAIN = {
  type: 'object',
  required: ['projectId'],
  properties: { projectId: { type: 'string' } },
  additionalProperties: false,
};
const OTHER = {
  type: 'object',
  required: ['topic'],
  properties: { topic: { type: 'string' } },
  additionalProperties: false,
};

describe('selectSettingsSchema', () => {
  const withMap: PackageSchema = {
    version: '1.0.0',
    settings: MAIN,
    exportSchemas: {
      destinationMain: { settings: MAIN },
      destinationOther: { settings: OTHER },
    },
    exports: ['destinationMain', 'destinationOther'],
  };
  const legacyMulti: PackageSchema = {
    version: '1.0.0',
    settings: MAIN,
    exports: ['destinationMain', 'destinationOther'],
  };
  const single: PackageSchema = {
    version: '1.0.0',
    settings: MAIN,
    exports: ['destinationMain'],
  };
  const undeclared: PackageSchema = { version: '1.0.0', settings: MAIN };
  const emptyDeclared: PackageSchema = {
    version: '1.0.0',
    settings: MAIN,
    exports: [],
  };

  it.each<[string, PackageSchema, string | undefined, SettingsSelection]>([
    [
      'the default export uses settings',
      withMap,
      undefined,
      { ok: true, settings: MAIN },
    ],
    [
      'a named export uses its map entry',
      withMap,
      'destinationOther',
      { ok: true, settings: OTHER },
    ],
    [
      'the default export named explicitly uses its map entry',
      withMap,
      'destinationMain',
      { ok: true, settings: MAIN },
    ],
    [
      'a name missing from the map resolves to nothing',
      withMap,
      'destinationNone',
      {
        ok: false,
        reason: '@acme/multi@1.0.0 has no export "destinationNone"',
      },
    ],
    [
      'a single-export package checks a named import against settings',
      single,
      'destinationMain',
      { ok: true, settings: MAIN },
    ],
    [
      'a package with an empty exports list checks a named import against settings',
      emptyDeclared,
      'destinationMain',
      { ok: true, settings: MAIN },
    ],
    [
      'a package that does not publish its exports is a skip for a named import',
      undeclared,
      'destinationMain',
      {
        ok: false,
        reason:
          '@acme/multi@1.0.0 predates per-export settings schemas; the step imports "destinationMain"',
      },
    ],
    [
      'a multi-export package without a map is a skip',
      legacyMulti,
      'destinationOther',
      {
        ok: false,
        reason:
          '@acme/multi@1.0.0 predates per-export settings schemas; the step imports "destinationOther"',
      },
    ],
  ])('%s', (_label, pkg, exportName, expected) => {
    expect(selectSettingsSchema(pkg, '@acme/multi@1.0.0', exportName)).toEqual(
      expected,
    );
  });
});

describe('validate with a local multi-export package', () => {
  let dir = '';

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'walkeros-export-schemas-'));
    const pkgDir = path.join(dir, 'multi');
    fs.mkdirSync(path.join(pkgDir, 'dist'), { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@acme/multi', version: '1.2.3' }),
    );
    fs.writeFileSync(
      path.join(pkgDir, 'dist', 'walkerOS.json'),
      JSON.stringify({
        $meta: {
          package: '@acme/multi',
          type: 'destination',
          platform: ['server'],
          exports: { destinationMain: 'Main', destinationOther: 'Other' },
        },
        schemas: { settings: MAIN, otherSettings: OTHER },
        exportSchemas: {
          destinationMain: { settings: MAIN },
          destinationOther: { settings: OTHER },
        },
      }),
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function flowWith(
    destination: Record<string, unknown>,
    imports?: string[],
  ): Flow.Json {
    return {
      version: 4,
      flows: {
        a: {
          config: {
            platform: 'server',
            bundle: {
              packages: {
                '@acme/multi': {
                  path: './multi',
                  ...(imports ? { imports } : {}),
                },
              },
            },
          },
          destinations: { other: destination },
        },
      },
    };
  }

  function skipped(result: ValidateResult): unknown[] {
    const list = result.details.skipped;
    return Array.isArray(list) ? list : [];
  }

  it.each<[string, Record<string, unknown>, string[] | undefined]>([
    [
      'the step import',
      {
        package: '@acme/multi',
        import: 'destinationOther',
        config: { settings: { topic: 42 } },
      },
      undefined,
    ],
    [
      'bundle.packages imports[0]',
      { package: '@acme/multi', config: { settings: { topic: 42 } } },
      ['destinationOther'],
    ],
  ])(
    'checks the export selected by %s against its own schema',
    async (_label, destination, imports) => {
      const result = await validate('flow', flowWith(destination, imports), {
        configDir: dir,
      });
      expect(
        result.warnings.map(({ path: at, code, keyword }) => ({
          at,
          code,
          keyword,
        })),
      ).toEqual([
        {
          at: 'flows.a.destinations.other.config.settings.topic',
          code: 'ENTRY_SCHEMA',
          keyword: 'type',
        },
      ]);
      expect(skipped(result)).toEqual([]);
      expect(result.details.packages).toEqual([
        {
          path: 'flows.a.destinations.other',
          package: '@acme/multi',
          version: '1.2.3',
        },
      ]);
    },
  );

  it('checks a step without import against the default export schema', async () => {
    const result = await validate(
      'flow',
      flowWith({
        package: '@acme/multi',
        config: { settings: { projectId: 'p' } },
      }),
      { configDir: dir },
    );
    expect(result.warnings).toEqual([]);
    expect(skipped(result)).toEqual([]);
  });
});
