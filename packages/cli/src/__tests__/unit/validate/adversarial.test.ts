// Adversarial validate suite (plan 2026-09-24-validate-and-runtime-fixes,
// fixtures F1 to F23, equivalence E1, E2, E4, E5). Each test states the
// behaviour the validate contract C1 to C10 guarantees; package schemas come
// from MSW only, never the network.

import '../../helpers/setup-msw.js';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { http, HttpResponse } from 'msw';
import type { Flow } from '@walkeros/core';
import { getFlowSettings } from '@walkeros/core';
import { validateFlowStructure } from '@walkeros/core/dev';
import { server } from '../../helpers/msw-server.js';
import { validate, validateCommand } from '../../../commands/validate/index.js';
import type {
  ValidateCommandOptions,
  ValidateResult,
} from '../../../commands/validate/types.js';

const FIXTURES = path.join(__dirname, '../../fixtures/validate-adversarial');
const EXAMPLES = path.join(__dirname, '../../../../examples');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFlowJson(value: unknown): value is Flow.Json {
  return isRecord(value) && 'version' in value && isRecord(value.flows);
}

function fixturePath(name: string): string {
  return path.join(FIXTURES, `${name}.json`);
}

function readFixture(name: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(fixturePath(name), 'utf-8'),
  );
  if (!isRecord(parsed)) throw new Error(`Fixture ${name} is not an object`);
  return parsed;
}

function section(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const inner = value[key];
  if (!isRecord(inner)) throw new Error(`Fixture has no object "${key}"`);
  return inner;
}

// --- MSW package catalogue (fixtures/validate-adversarial/msw-packages.json)

interface CataloguedVersion {
  version: string;
  type: string;
  platform: string;
  schemas: Record<string, unknown>;
}

const catalogue = readFixture('msw-packages');

function lookupPackage(
  name: string,
  version: string,
): CataloguedVersion | undefined {
  const versions = catalogue[name];
  if (!isRecord(versions)) return undefined;
  const latest = versions.latest;
  const exact = versions[version];
  const hit =
    exact ??
    (isRecord(latest) && latest.version === version ? latest : undefined);
  if (!isRecord(hit) || !isRecord(hit.schemas)) return undefined;
  return {
    version: String(hit.version),
    type: String(hit.type),
    platform: String(hit.platform),
    schemas: hit.schemas,
  };
}

const JSDELIVR =
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/(.+)@([^/@]+)\/(package\.json|dist\/walkerOS\.json)$/;

const packageHandlers = [
  http.get(JSDELIVR, ({ request }) => {
    const match = request.url.match(JSDELIVR);
    const pkg = match ? lookupPackage(match[1], match[2]) : undefined;
    if (!match || !pkg) return new HttpResponse(null, { status: 404 });
    if (match[3] === 'package.json')
      return HttpResponse.json({ name: match[1], version: pkg.version });
    return HttpResponse.json({
      $meta: { type: pkg.type, platform: pkg.platform },
      schemas: pkg.schemas,
    });
  }),
  // The app's unified package endpoint, should validate move to it.
  http.get(/\/api\/packages\/[^?]+/, ({ request }) => {
    const url = new URL(request.url);
    const name = decodeURIComponent(
      url.pathname.replace(/^.*\/api\/packages\//, ''),
    );
    const pkg = lookupPackage(
      name,
      url.searchParams.get('version') ?? 'latest',
    );
    if (!pkg) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({
      package: name,
      version: pkg.version,
      type: pkg.type,
      platform: [pkg.platform],
      schemas: pkg.schemas,
    });
  }),
];

beforeEach(() => {
  server.use(...packageHandlers);
});

// --- Result helpers

/** True when `value` holds `key: expected` at any depth. */
function deepHas(value: unknown, key: string, expected: unknown): boolean {
  if (Array.isArray(value))
    return value.some((item) => deepHas(item, key, expected));
  if (!isRecord(value)) return false;
  if (key in value && value[key] === expected) return true;
  return Object.values(value).some((item) => deepHas(item, key, expected));
}

function withoutScope(result: ValidateResult): ValidateResult {
  return {
    ...result,
    details: Object.fromEntries(
      Object.entries(result.details).filter(([key]) => key !== 'scope'),
    ),
  };
}

function skippedOf(result: ValidateResult): unknown[] {
  const skipped = result.details.skipped;
  return Array.isArray(skipped) ? skipped : [];
}

const at = (prefix: string) =>
  expect.stringMatching(
    new RegExp(`^${prefix.replace(/[.$]/g, (c) => `\\${c}`)}(\\.|$)`),
  );

// --- CLI runner: exit code is the FIRST process.exit call (the stub throws,
// so the command's catch block calls exit a second time).

/** Options the contract adds (C10 `offline`); a superset of today's type. */
type ValidateOptionsNext = NonNullable<Parameters<typeof validate>[2]> & {
  offline?: boolean;
};

type CliOptions = ValidateCommandOptions & { offline?: boolean };

async function runCli(
  options: CliOptions,
): Promise<{ exit: string | number | null | undefined; output: string }> {
  const exitCodes: Array<string | number | null | undefined> = [];
  const exitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation((code?: string | number | null | undefined) => {
      exitCodes.push(code);
      throw new Error(`__exit__:${code}`);
    });
  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const outFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'walkeros-adv-')),
    'result.txt',
  );
  try {
    await validateCommand({ ...options, output: outFile }).catch(() => {});
    const output = fs.existsSync(outFile)
      ? fs.readFileSync(outFile, 'utf-8')
      : '';
    return { exit: exitCodes[0], output };
  } finally {
    exitSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(path.dirname(outFile), { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------

describe('C3 --path on a multi-flow file', () => {
  it('F1: without --flow validates the entry in every flow that has it', async () => {
    const result = await validate('flow', fixturePath('f1-two-flows'), {
      path: 'destinations.ga4',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.b.destinations.ga4'),
        code: 'ENTRY_SCHEMA',
        keyword: 'pattern',
      }),
    );
    expect(result.errors.filter((e) => e.path.startsWith('flows.a.'))).toEqual(
      [],
    );
    expect(result.details.scope).toMatchObject({
      entry: { section: 'destinations', key: 'ga4', flows: ['a', 'b'] },
    });
  });

  it('F1: CLI exits 1 on the broken second flow', async () => {
    const { exit } = await runCli({
      type: 'flow',
      input: fixturePath('f1-two-flows'),
      path: 'destinations.ga4',
    });
    expect(exit).toBe(1);
  });

  it('F1b: --flow a narrows the entry check to flow a', async () => {
    const result = await validate('flow', fixturePath('f1-two-flows'), {
      path: 'destinations.ga4',
      flow: 'a',
    });
    expect(result.valid).toBe(true);
    expect(result.details.scope).toMatchObject({
      flows: ['a'],
      entry: { section: 'destinations', key: 'ga4', flows: ['a'] },
    });
  });

  it('F1b: --flow b checks flow b, not the first flow', async () => {
    const result = await validate('flow', fixturePath('f1-two-flows'), {
      path: 'destinations.ga4',
      flow: 'b',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.b.destinations.ga4'),
        code: 'ENTRY_SCHEMA',
      }),
    );
    expect(result.details.scope).toMatchObject({
      flows: ['b'],
      entry: { flows: ['b'] },
    });
  });

  it('F2: finds an entry that exists only in the last flow', async () => {
    const result = await validate('flow', fixturePath('f2-three-flows'), {
      path: 'destinations.meta',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.c.destinations.meta'),
        code: 'ENTRY_SCHEMA',
      }),
    );
    expect(result.details.scope).toMatchObject({
      entry: {
        section: 'destinations',
        key: 'meta',
        flows: ['c'],
        searchedFlows: ['a', 'b', 'c'],
      },
    });
  });

  it('F2b: --flow a with an entry only in flow c is ENTRY_NOT_FOUND naming a', async () => {
    const result = await validate('flow', fixturePath('f2-three-flows'), {
      path: 'destinations.meta',
      flow: 'a',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'ENTRY_NOT_FOUND' }),
    );
    expect(result.details.scope).toMatchObject({
      entry: { flows: [], searchedFlows: ['a'] },
    });
  });

  it('F3: an entry in no flow is ENTRY_NOT_FOUND and lists the flows searched', async () => {
    const result = await validate('flow', fixturePath('f2-three-flows'), {
      path: 'destinations.nope',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'ENTRY_NOT_FOUND' }),
    );
    expect(result.details.scope).toMatchObject({
      entry: { flows: [], searchedFlows: ['a', 'b', 'c'] },
    });
  });
});

describe('V3 contracts in the default run', () => {
  it.each([
    ['plain', false],
    ['strict', true],
  ])(
    'F4: a dangling contract extend is an error (%s)',
    async (_mode, strict) => {
      const result = await validate('flow', fixturePath('f4-dangling-extend'), {
        strict,
      });
      expect(result).toMatchObject({ valid: false });
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'contract.server.extend',
          code: 'INVALID_EXTENDS',
        }),
      );
      expect(result.details.scope).toMatchObject({ flows: ['a'] });
    },
  );

  it('F4: CLI exits 1 without --strict', async () => {
    const { exit } = await runCli({
      type: 'flow',
      input: fixturePath('f4-dangling-extend'),
    });
    expect(exit).toBe(1);
  });

  it('F5: -t contract on a flow file validates its contract section', async () => {
    const result = await validate('contract', fixturePath('f5-contract-valid'));
    expect(result.valid).toBe(true);
    expect(result.details.scope).toMatchObject({
      checks: expect.arrayContaining([expect.stringMatching(/contract/)]),
    });
  });

  it('F5 GUARD: a standalone contract object stays valid', async () => {
    const contract = section(readFixture('f5-contract-valid'), 'contract');
    const result = await validate('contract', contract);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('F5b / E2: -t contract on a flow file equals -t contract on its section', async () => {
    const onFile = await validate(
      'contract',
      fixturePath('f4-dangling-extend'),
    );
    const onSection = await validate(
      'contract',
      section(readFixture('f4-dangling-extend'), 'contract'),
    );
    expect(onFile.errors).toContainEqual(
      expect.objectContaining({
        path: 'server.extend',
        code: 'INVALID_EXTENDS',
      }),
    );
    expect(onFile.errors).toEqual(onSection.errors);
    expect(onFile.warnings).toEqual(onSection.warnings);
    expect(onFile.details.scope).toMatchObject({
      checks: expect.arrayContaining([expect.stringMatching(/contract/)]),
    });
  });

  it('E4: --strict on a flow reports every error -t contract reports for its contract', async () => {
    const contractResult = await validate(
      'contract',
      section(readFixture('f4-dangling-extend'), 'contract'),
    );
    const flowResult = await validate(
      'flow',
      fixturePath('f4-dangling-extend'),
      { strict: true },
    );
    expect(contractResult.errors.length).toBeGreaterThan(0);
    for (const error of contractResult.errors) {
      expect(flowResult.errors).toContainEqual(
        expect.objectContaining({
          path: `contract.${error.path}`,
          code: error.code,
        }),
      );
    }
    expect(flowResult.details.scope).toMatchObject({ flows: ['a'] });
  });

  it('F7 GUARD: a validate step example that breaks its contract is an error under --strict', async () => {
    const result = await validate('flow', fixturePath('f7-validate-step'), {
      strict: true,
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: expect.stringMatching(
          /transformers?\.validate\.examples\.order\.out$/,
        ),
        code: 'CONTRACT_VIOLATION',
      }),
    );
  });

  it('F7: plain run reports it as a CONTRACT_VIOLATION warning, exit 0', async () => {
    const result = await validate('flow', fixturePath('f7-validate-step'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: expect.stringMatching(
          /transformers?\.validate\.examples\.order\.out$/,
        ),
        code: 'CONTRACT_VIOLATION',
      }),
    );
    const { exit } = await runCli({
      type: 'flow',
      input: fixturePath('f7-validate-step'),
    });
    expect(exit).toBe(0);
  });

  it('F7 GUARD: CLI --strict exits 1', async () => {
    const { exit } = await runCli({
      type: 'flow',
      input: fixturePath('f7-validate-step'),
      strict: true,
    });
    expect(exit).toBe(1);
  });

  it('F18: a validate step linking an unknown $contract is an error, not an unjudged step', async () => {
    const result = await validate(
      'flow',
      fixturePath('f18-unknown-contract-ref'),
    );
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.server.transformers.validate'),
        code: expect.any(String),
      }),
    );
    expect(result.details.scope).toMatchObject({ flows: ['server'] });
  });

  it('F22: a circular extend is reported once per cycle, not once per member', async () => {
    const result = await validate(
      'contract',
      readFixture('f22-circular-extend'),
    );
    expect(result).toMatchObject({ valid: false });
    const cycles = result.errors.filter((e) => e.code === 'CIRCULAR_EXTENDS');
    expect(cycles).toHaveLength(1);
    expect(cycles[0].path).toMatch(/^loop[AB]\.extend$/);
  });
});

describe('V2 placeholders against package schemas', () => {
  it('F6: $env.NAME:default is checked using the default (valid default)', async () => {
    const result = await validate('flow', fixturePath('f6-env-default'), {
      path: 'destinations.ga4',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('F6b: a bad $env default is an error that names the default, never the placeholder', async () => {
    const result = await validate('flow', fixturePath('f6b-env-bad-default'), {
      path: 'destinations.ga4',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.b.destinations.ga4'),
        code: 'ENTRY_SCHEMA',
      }),
    );
    expect(JSON.stringify(result.errors)).not.toContain('$env.GA4_ID:bad');
    expect(deepHas(result.errors, 'value', 'bad')).toBe(true);
    expect(result.details.scope).toMatchObject({ entry: { flows: ['b'] } });
  });

  it('F6b: the whole-file run reports the same default as an ENTRY_SCHEMA warning (D3)', async () => {
    const result = await validate('flow', fixturePath('f6b-env-bad-default'));
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: at('flows.b.destinations.ga4.config.settings.id'),
        code: 'ENTRY_SCHEMA',
      }),
    );
    expect(JSON.stringify(result.warnings)).not.toContain('$env.GA4_ID:bad');
  });

  it.each([
    ['ga4env', '$env.GA4_ID'],
    ['ga4secret', '$secret.X'],
    ['ga4flow', '$flow.a.url'],
    ['ga4store', '$store.s'],
  ])(
    'F6c: %s (%s) is known only at runtime: valid and listed in details.deferred',
    async (name) => {
      const result = await validate('flow', fixturePath('f6c-runtime-refs'), {
        path: `destinations.${name}`,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        deepHas(
          result.details.deferred,
          'path',
          `flows.b.destinations.${name}.config.settings.id`,
        ),
      ).toBe(true);
      expect(skippedOf(result)).toEqual([]);
    },
  );

  it('F6c: the whole-file run defers the same four values and skips none of them', async () => {
    const result = await validate('flow', fixturePath('f6c-runtime-refs'));
    expect(result.errors).toEqual([]);
    for (const name of ['ga4env', 'ga4secret', 'ga4flow', 'ga4store']) {
      expect(
        deepHas(
          result.details.deferred,
          'path',
          `flows.b.destinations.${name}.config.settings.id`,
        ),
      ).toBe(true);
    }
    expect(result.warnings.filter((w) => w.code === 'ENTRY_SCHEMA')).toEqual(
      [],
    );
  });

  it('F6d: $var resolves statically and the resolved value is checked', async () => {
    const good = await validate('flow', fixturePath('f6d-var'), {
      path: 'destinations.good',
    });
    expect(good.valid).toBe(true);

    const bad = await validate('flow', fixturePath('f6d-var'), {
      path: 'destinations.bad',
    });
    expect(bad).toMatchObject({ valid: false });
    expect(bad.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.b.destinations.bad'),
        code: 'ENTRY_SCHEMA',
      }),
    );
    expect(deepHas(bad.errors, 'value', 'nope')).toBe(true);
    expect(bad.details.scope).toMatchObject({ entry: { flows: ['b'] } });
  });
});

describe('C1 default scope and C5 skips', () => {
  it('F8: a schema error in flow a does not silently hide the route error in flow b', async () => {
    const result = await validate('flow', fixturePath('f8-a-schema-b-route'));
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.a'),
        code: 'SCHEMA_VALIDATION',
      }),
    );
    const routeReported = result.errors.some(
      (e) => e.code === 'UNKNOWN_ROUTE_TARGET' && e.path.startsWith('flows.b.'),
    );
    const routeSkipped = deepHas(skippedOf(result), 'path', 'flows.b');
    expect(routeReported || routeSkipped).toBe(true);
    expect(result.details.scope).toMatchObject({ flows: ['a', 'b'] });
  });

  it('F9: --path stores.cache validates the store against its settings schema', async () => {
    const result = await validate('flow', fixturePath('f9-stores'), {
      path: 'stores.cache',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.a.stores.cache'),
        code: 'ENTRY_SCHEMA',
        keyword: 'type',
      }),
    );
    expect(result.details.scope).toMatchObject({
      entry: { section: 'stores', key: 'cache', flows: ['a'] },
    });
  });

  it('F9: --path collector.x is UNSUPPORTED_SECTION', async () => {
    const result = await validate('flow', fixturePath('f9-stores'), {
      path: 'collector.x',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'collector.x',
        code: 'UNSUPPORTED_SECTION',
      }),
    );
    expect(result.details.scope).toMatchObject({ flows: ['a'] });
  });

  it('F10: the entry is checked against the pinned package version', async () => {
    const result = await validate('flow', fixturePath('f10-pinned'), {
      path: 'destinations.ga4',
    });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.a.destinations.ga4'),
        code: 'ENTRY_SCHEMA',
        keyword: 'required',
      }),
    );
    expect(deepHas(result.details, 'version', '1.0.0')).toBe(true);
    expect(result.details.scope).toMatchObject({ entry: { flows: ['a'] } });
  });

  it.each([
    ['destinations.local', 'no package'],
    ['destinations.noschema', 'no settings schema'],
  ])('F11: %s (%s) is valid and reported as a skip', async (entryPath) => {
    const result = await validate('flow', fixturePath('f11-skips'), {
      path: entryPath,
    });
    expect(result.valid).toBe(true);
    expect(skippedOf(result)).toContainEqual(
      expect.objectContaining({
        path: at(`flows.a.${entryPath}`),
        code: expect.any(String),
        check: expect.any(String),
        reason: expect.any(String),
      }),
    );
  });

  it('F11: CLI text output prints the skip without --verbose, never "All checks passed"', async () => {
    const { exit, output } = await runCli({
      type: 'flow',
      input: fixturePath('f11-skips'),
      path: 'destinations.noschema',
    });
    expect(exit).toBe(0);
    expect(output).not.toContain('All checks passed');
    expect(output).toMatch(/skipped/);
    expect(output).toContain('Scope:');
  });

  it('F12 (N2): flow b using $var and $store defined only in flow a is invalid', async () => {
    const result = await validate('flow', fixturePath('f12-cross-flow-refs'));
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.b'),
        code: expect.any(String),
      }),
    );
    expect(result.errors.filter((e) => e.path.startsWith('flows.a'))).toEqual(
      [],
    );
    expect(result.details.scope).toMatchObject({ flows: ['a', 'b'] });
  });

  it('F13 (N1): the whole-file run checks package settings and warns (D3)', async () => {
    const result = await validate('flow', fixturePath('f13-bad-setting'));
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'flows.a.destinations.ga4.config.settings.id',
        code: 'ENTRY_SCHEMA',
      }),
    );
    expect(result.details.scope).toMatchObject({ flows: ['a'] });
  });

  it('F13 (N1): --strict exits 2 on the settings warning', async () => {
    const { exit } = await runCli({
      type: 'flow',
      input: fixturePath('f13-bad-setting'),
      strict: true,
    });
    expect(exit).toBe(2);
  });

  it('F14 (N4): --flow a is valid although flow b has a per-flow error', async () => {
    const result = await validate('flow', fixturePath('f14-flow-scope'), {
      flow: 'a',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.details.scope).toMatchObject({ flows: ['a'] });
  });

  it('F14 GUARD: without --flow the error in flow b is reported', async () => {
    const result = await validate('flow', fixturePath('f14-flow-scope'));
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'flows.b.transformers.broken',
        code: 'UNKNOWN_KEY',
      }),
    );
  });

  it('F14: file-level errors still run under --flow', async () => {
    const file = readFixture('f14-flow-scope');
    const withContract = {
      ...file,
      contract: { server: { extend: 'missing' } },
    };
    const result = await validate('flow', withContract, { flow: 'a' });
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: 'contract.server.extend',
        code: 'INVALID_EXTENDS',
      }),
    );
    expect(result.errors.filter((e) => e.path.startsWith('flows.b'))).toEqual(
      [],
    );
    expect(result.details.scope).toMatchObject({ flows: ['a'] });
  });

  it('F15 (N9): the same step name in two flows keeps the flow in the path', async () => {
    const result = await validate(
      'flow',
      fixturePath('f15-same-step-two-flows'),
    );
    const paths = result.warnings.map((w) => w.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'flows.a.destinations.api.config.mapping',
        'flows.b.destinations.api.config.mapping',
      ]),
    );
  });

  it('F16 (C9): the CLI reports @walkeros/store-memory as DEPRECATED_PACKAGE (warning, D3)', async () => {
    const result = await validate('flow', fixturePath('f16-store-memory'));
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        path: 'flows.a.stores.cache',
        code: 'DEPRECATED_PACKAGE',
      }),
    );
  });

  it('F17 (C7): a file whose only finding is a skip exits 0 by default', async () => {
    const result = await validate('flow', fixturePath('f17-only-skip'));
    expect(result.valid).toBe(true);
    expect(skippedOf(result)).toContainEqual(
      expect.objectContaining({
        path: at('flows.a.destinations.d'),
        code: expect.any(String),
      }),
    );
    const { exit } = await runCli({
      type: 'flow',
      input: fixturePath('f17-only-skip'),
    });
    expect(exit).toBe(0);
  });

  it('F17 (C7): the same file exits 2 under --strict', async () => {
    const { exit } = await runCli({
      type: 'flow',
      input: fixturePath('f17-only-skip'),
      strict: true,
    });
    expect(exit).toBe(2);
  });
});

describe('Other entry points', () => {
  it('F19 (N10): -t mapping accepts the nested runtime shape', async () => {
    const result = await validate('mapping', fixturePath('f19-nested-mapping'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('F20 (N5): --path with -t contract is OPTION_NOT_APPLICABLE, exit 3', async () => {
    const { exit, output } = await runCli({
      type: 'contract',
      input: fixturePath('f1-two-flows'),
      path: 'destinations.ga4',
      json: true,
    });
    expect(exit).toBe(3);
    const parsed: unknown = JSON.parse(output);
    expect(parsed).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ code: 'OPTION_NOT_APPLICABLE' })],
    });
  });
});

describe('Equivalence', () => {
  it('E1: --path with --flow b equals --path on a file with only flow b', async () => {
    const file = readFixture('f1-two-flows');
    const flows = section(file, 'flows');
    const onlyB = { ...file, flows: { b: flows.b } };

    const narrowed = await validate('flow', file, {
      path: 'destinations.ga4',
      flow: 'b',
    });
    const alone = await validate('flow', onlyB, { path: 'destinations.ga4' });

    expect(narrowed.errors).toContainEqual(
      expect.objectContaining({
        path: at('flows.b.destinations.ga4'),
        code: 'ENTRY_SCHEMA',
      }),
    );
    expect(withoutScope(narrowed)).toEqual(withoutScope(alone));
    expect(narrowed.details.scope).toMatchObject({ flows: ['b'] });
  });

  const optionProbes: Array<[string, ValidateOptionsNext, string]> = [
    ['flow', { flow: 'a' }, 'f14-flow-scope'],
    ['path', { path: 'destinations.ga4' }, 'f1-two-flows'],
    ['strict', { strict: true }, 'f7-validate-step'],
    ['offline', { offline: true }, 'f13-bad-setting'],
  ];

  it.each(optionProbes)(
    'E5: the CLI option %s reaches validate()',
    async (_key, option, fixture) => {
      const direct = await validate('flow', fixturePath(fixture), option);
      const { output } = await runCli({
        type: 'flow',
        input: fixturePath(fixture),
        ...option,
      });
      // Text output lists every error and warning path of the direct result.
      for (const issue of [...direct.errors, ...direct.warnings]) {
        expect(output).toContain(issue.path);
      }
      const baseline = await validate('flow', fixturePath(fixture));
      expect(withoutScope(direct)).not.toEqual(withoutScope(baseline));
    },
  );
});

// F23 (C9): validate valid implies bundle preflight valid, over every example.
const exampleFlows = fs
  .readdirSync(EXAMPLES)
  .filter((name) => name.endsWith('.json'))
  .filter((name) => {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(path.join(EXAMPLES, name), 'utf-8'),
    );
    return isFlowJson(parsed);
  });

describe('F23 invariant: validate valid implies structure valid and every flow resolves', () => {
  it.each(exampleFlows)('%s', async (name) => {
    const file = path.join(EXAMPLES, name);
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!isFlowJson(parsed)) throw new Error(`${name} is not a flow file`);

    const result = await validate('flow', parsed);
    if (!result.valid) return;

    const structure = validateFlowStructure(parsed);
    expect(structure.errors).toEqual([]);
    for (const flowName of Object.keys(parsed.flows)) {
      expect(() =>
        getFlowSettings(parsed, flowName, { deferred: true }),
      ).not.toThrow();
    }
  });
});
