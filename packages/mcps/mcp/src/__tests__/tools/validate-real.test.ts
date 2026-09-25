// flow_validate against the real @walkeros/cli validate (no module mocks), on
// the adversarial fixtures of plan 2026-09-24-validate-and-runtime-fixes:
// F1, F4, F7, F16, equivalence E3 (MCP equals validate()) and E5 (every
// option reaches validate()). Package schemas come from MSW only.

import * as fs from 'fs';
import * as path from 'path';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { validate } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import { createLocalRuntime } from '../../runtime/local.js';
import { createFlowValidateToolSpec } from '../../tools/validate.js';

const FIXTURES = path.join(
  __dirname,
  '../../../../../cli/src/__tests__/fixtures/validate-adversarial',
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fixturePath(name: string): string {
  return path.join(FIXTURES, `${name}.json`);
}

const catalogueRaw: unknown = JSON.parse(
  fs.readFileSync(fixturePath('msw-packages'), 'utf-8'),
);
const catalogue: Record<string, unknown> = isRecord(catalogueRaw)
  ? catalogueRaw
  : {};

function lookupPackage(
  name: string,
  version: string,
): Record<string, unknown> | undefined {
  const versions = catalogue[name];
  if (!isRecord(versions)) return undefined;
  const latest = versions.latest;
  const hit =
    versions[version] ??
    (isRecord(latest) && latest.version === version ? latest : undefined);
  return isRecord(hit) ? hit : undefined;
}

const JSDELIVR =
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/(.+)@([^/@]+)\/(package\.json|dist\/walkerOS\.json)$/;

const server = setupServer(
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
    return HttpResponse.json({ package: name, ...pkg });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const spec = createFlowValidateToolSpec(createLocalRuntime());

/** The structured result of a successful tool call, without its hints. */
async function callTool(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await spec.handler(input);
  expect(response).toMatchObject({ structuredContent: expect.any(Object) });
  expect(isRecord(response) ? response.isError : undefined).not.toBe(true);
  const structured = isRecord(response) ? response.structuredContent : {};
  if (!isRecord(structured)) throw new Error('No structured content');
  return Object.fromEntries(
    Object.entries(structured).filter(([key]) => key !== '_hints'),
  );
}

describe('flow_validate on the real validator', () => {
  it('F1: path without flow reports the broken entry in flow b', async () => {
    const result = await callTool({
      type: 'flow',
      input: fixturePath('f1-two-flows'),
      path: 'destinations.ga4',
    });
    expect(result).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringMatching(/^flows\.b\.destinations\.ga4(\.|$)/),
          code: 'ENTRY_SCHEMA',
        }),
      ]),
      details: {
        scope: { entry: { key: 'ga4', flows: ['a', 'b'] } },
      },
    });
  });

  it.each([
    ['default', {}],
    ['strict', { strict: true }],
  ])(
    'F4: a dangling contract extend is an error (%s)',
    async (_mode, option) => {
      const result = await callTool({
        type: 'flow',
        input: fixturePath('f4-dangling-extend'),
        ...option,
      });
      expect(result).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'contract.server.extend',
            code: 'INVALID_EXTENDS',
          }),
        ]),
        details: { scope: { flows: ['a'] } },
      });
    },
  );

  it('F7: strict: true makes the contract disagreement an error, as CLI --strict', async () => {
    const result = await callTool({
      type: 'flow',
      input: fixturePath('f7-validate-step'),
      strict: true,
    });
    expect(result).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringMatching(
            /transformers?\.validate\.examples\.order\.out$/,
          ),
          code: 'CONTRACT_VIOLATION',
        }),
      ]),
      details: { scope: { flows: ['server'] } },
    });
  });

  it('F7 GUARD: without strict it stays valid with the disagreement as a warning', async () => {
    const result = await callTool({
      type: 'flow',
      input: fixturePath('f7-validate-step'),
    });
    expect(result).toMatchObject({
      valid: true,
      warnings: expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringMatching(
            /transformers?\.validate\.examples\.order\.out$/,
          ),
        }),
      ]),
    });
  });

  it('F16: @walkeros/store-memory is a DEPRECATED_PACKAGE warning, as in the CLI (D3)', async () => {
    const result = await callTool({
      type: 'flow',
      input: fixturePath('f16-store-memory'),
    });
    expect(result).toMatchObject({
      valid: true,
      warnings: expect.arrayContaining([
        expect.objectContaining({
          path: 'flows.a.stores.cache',
          code: 'DEPRECATED_PACKAGE',
        }),
      ]),
    });
  });
});

describe('E3: flow_validate equals validate() for the same input and options', () => {
  it.each([
    ['f1-two-flows', { path: 'destinations.ga4' }],
    ['f4-dangling-extend', {}],
    ['f7-validate-step', {}],
    ['f7-validate-step', { strict: true }],
    ['f16-store-memory', {}],
  ])('%s %j', async (fixture, option) => {
    const viaTool = await callTool({
      type: 'flow',
      input: fixturePath(fixture),
      ...option,
    });
    const direct = await validate('flow', fixturePath(fixture), option);
    expect(viaTool).toEqual(direct);
  });
});

describe('E5: every flow_validate option reaches validate()', () => {
  const probes: Array<[string, Record<string, unknown>, string]> = [
    ['flow', { flow: 'a' }, 'f14-flow-scope'],
    ['path', { path: 'destinations.ga4' }, 'f1-two-flows'],
    ['strict', { strict: true }, 'f7-validate-step'],
    ['offline', { offline: true }, 'f13-bad-setting'],
  ];

  it('the input shape exposes exactly the CLI options (C10)', () => {
    expect(Object.keys(schemas.ValidateInputShape).sort()).toEqual(
      ['flow', 'input', 'offline', 'path', 'strict', 'type'].sort(),
    );
    expect(probes.map(([key]) => key).sort()).toEqual(
      Object.keys(schemas.ValidateInputShape)
        .filter((key) => key !== 'type' && key !== 'input')
        .sort(),
    );
  });

  it.each(probes)('%s changes the result', async (_key, option, fixture) => {
    const withOption = await callTool({
      type: 'flow',
      input: fixturePath(fixture),
      ...option,
    });
    const baseline = await callTool({
      type: 'flow',
      input: fixturePath(fixture),
    });
    const strip = (result: Record<string, unknown>) => ({
      ...result,
      details: Object.fromEntries(
        Object.entries(isRecord(result.details) ? result.details : {}).filter(
          ([key]) => key !== 'scope',
        ),
      ),
    });
    expect(strip(withOption)).not.toEqual(strip(baseline));
  });
});
