import './support/version.js';

// Mock @walkeros/cli to keep its ESM-only transitive deps (chalk) out of the
// transform path. The diagnostics tool reads VERSION, bakedContractVersion and
// operationUrl from it; the app URL and the contract verdict come from the
// client, which `localDoor` below stands in for.
const MOCK_CLI_VERSION = '5.4.3-test';
const MOCK_CONTRACT_LABEL = '4.7.0+1a2b3c4d';
// The catalog reaches the app through the CLI's typed client.
const mockApiRequest = jest.fn();
jest.mock('@walkeros/cli', () => ({
  VERSION: '5.4.3-test',
  bakedContractVersion: '4.7.0+1a2b3c4d',
  operationUrl: (op: string, init: { baseUrl: string }) =>
    `${init.baseUrl}${op.slice(op.indexOf(' ') + 1)}`,
  apiRequest: (op: unknown, init: unknown) => mockApiRequest(op, init),
}));

import { z } from 'zod';
import type { ContractComparison } from '@walkeros/cli';
import { createDiagnosticsToolSpec } from '../tools/diagnostics.js';
import { structured } from './support/tool-result.js';
import { stubClient } from './support/stub-client.js';
import type { ToolClient } from '../tool-client.js';
import { normalizeBaseUrl } from '../base-url.js';
import { clearCatalogCache, fetchCatalog } from '../catalog.js';
import { SERVER_INSTRUCTIONS } from '../instructions.js';

const CLI_VERSION = MOCK_CLI_VERSION;

/**
 * The structured diagnostics payload the assertions read, parsed rather than
 * cast so a shape drift fails here, naming the field.
 */
const DiagnosticsResult = z.object({
  mcp: z.object({ version: z.string() }),
  cli: z.object({ version: z.string() }),
  appUrl: z.object({ resolved: z.string(), source: z.string() }),
  app: z.object({
    reachable: z.boolean(),
    status: z.string().optional(),
    version: z.string().optional(),
  }),
  contract: z.looseObject({
    openapiVersion: z.string(),
    verdict: z.string(),
    appUrl: z.string(),
    client: z.object({
      package: z.string(),
      version: z.string(),
      contract: z.string(),
    }),
    reason: z.string().optional(),
  }),
  catalog: z.object({
    lastSource: z.string().optional(),
    lastCount: z.number().optional(),
    partial: z.boolean().optional(),
  }),
  _hints: z
    .object({
      next: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    })
    .optional(),
});
type DiagnosticsResult = z.infer<typeof DiagnosticsResult>;

const IN_SYNC: ContractComparison = {
  verdict: 'in-sync',
  appUrl: 'https://app.walkeros.io',
  client: {
    package: '@walkeros/mcp',
    version: '7.7.7',
    contract: MOCK_CONTRACT_LABEL,
  },
  server: '4.7.0+5e6f7a8b',
  operations: 55,
  missing: [],
  changed: [],
};

/**
 * A stub standing in for the LOCAL door: its `appBaseUrl` resolves the same
 * env-then-default chain the CLI-backed client hands the tool, normalized the
 * same way, so the appUrl assertions exercise real provenance rather than a
 * constant. `HttpToolClient`'s own delegation is pinned in
 * `http-tool-client.test.ts`.
 */
function localDoor(overrides: Partial<ToolClient> = {}): ToolClient {
  return stubClient({
    appBaseUrl: () =>
      normalizeBaseUrl(
        process.env.WALKEROS_APP_URL ?? 'https://app.walkeros.io',
      ),
    checkContract: async () => IN_SYNC,
    ...overrides,
  });
}

async function runDiagnostics(
  client = localDoor(),
  packageVersion = '7.7.7',
): Promise<DiagnosticsResult> {
  const spec = createDiagnosticsToolSpec(client, packageVersion);
  return DiagnosticsResult.parse(structured(await spec.handler({})));
}

describe('diagnostics tool', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearCatalogCache();
    global.fetch = mockFetch;
    delete process.env.WALKEROS_APP_URL;
  });

  afterEach(() => {
    delete process.env.WALKEROS_APP_URL;
  });

  it('server instructions reference the diagnostics tool for failed requests', () => {
    expect(SERVER_INSTRUCTIONS).toContain('diagnostics');
  });

  it('registers with readOnlyHint and no required input fields', () => {
    const spec = createDiagnosticsToolSpec(stubClient(), '0.0.0');
    expect(spec.name).toBe('diagnostics');
    expect(spec.annotations.readOnlyHint).toBe(true);
    expect(Object.keys(spec.inputSchema)).toHaveLength(0);
  });

  it('reports the threaded mcp package version (no global mutation)', async () => {
    const out = await runDiagnostics(stubClient(), '7.7.7');
    expect(out.mcp.version).toBe('7.7.7');
  });

  it('reports the CLI VERSION', async () => {
    const out = await runDiagnostics();
    expect(out.cli.version).toBe(CLI_VERSION);
  });

  it('reports appUrl source as default with a warning when env is unset', async () => {
    const out = await runDiagnostics();
    expect(out.appUrl.source).toBe('default');
    expect(out._hints?.warnings).toEqual([
      'WALKEROS_APP_URL is not set; app URL from default',
    ]);
  });

  it('reports appUrl source as env when WALKEROS_APP_URL is set', async () => {
    process.env.WALKEROS_APP_URL = 'https://app.test';
    const out = await runDiagnostics();
    expect(out.appUrl.source).toBe('env');
    expect(out.appUrl.resolved).toBe('https://app.test');
  });

  it('keeps the env provenance for a slashed WALKEROS_APP_URL', async () => {
    // A valid URL may carry a trailing slash, and the interface promises a
    // base without one. Comparing the raw env value against the normalized
    // base would report `default` and warn that the variable did not set the
    // URL, when it plainly did.
    process.env.WALKEROS_APP_URL = 'https://stage.app.walkeros.io/';
    const out = await runDiagnostics();
    expect(out.appUrl.resolved).toBe('https://stage.app.walkeros.io');
    expect(out.appUrl.source).toBe('env');
    expect(out._hints?.warnings ?? []).not.toContainEqual(
      expect.stringContaining('WALKEROS_APP_URL'),
    );
  });

  it('reports the app URL the client names, not the local CLI resolution', async () => {
    // The hosted door runs inside the app it reports and ignores the local
    // env var entirely. Resolving the URL in the tool would name the wrong
    // backend here, which is the whole point of the client seam.
    process.env.WALKEROS_APP_URL = 'https://app.test';
    const out = await runDiagnostics(
      stubClient({ appBaseUrl: () => 'https://stage.app.walkeros.io' }),
    );
    expect(out.appUrl.resolved).toBe('https://stage.app.walkeros.io');
  });

  it('withholds the env provenance from a client that did not use the env var', async () => {
    process.env.WALKEROS_APP_URL = 'https://app.test';
    const out = await runDiagnostics(
      stubClient({ appBaseUrl: () => 'https://stage.app.walkeros.io' }),
    );
    expect(out.appUrl.source).toBe('default');
  });

  it('reports app.reachable true when checkHealth resolves reachable', async () => {
    const client = localDoor({
      checkHealth: async () => ({ reachable: true, status: 'ok' }),
    });
    const out = await runDiagnostics(client);
    expect(out.app.reachable).toBe(true);
    expect(out.app.status).toBe('ok');
  });

  it('reports the app version from checkHealth', async () => {
    const client = localDoor({
      checkHealth: async () => ({
        reachable: true,
        status: 'ok',
        version: 'abc1234',
      }),
    });
    const out = await runDiagnostics(client);
    expect(out.app).toEqual({
      reachable: true,
      status: 'ok',
      version: 'abc1234',
    });
  });

  it('states the failed health request and its reason', async () => {
    const client = localDoor({
      checkHealth: async () => ({
        reachable: false,
        error: 'timeout after 5000 ms',
      }),
    });
    const out = await runDiagnostics(client);
    expect(out.app.reachable).toBe(false);
    expect(out._hints?.warnings).toContain(
      'GET https://app.walkeros.io/api/health failed: timeout after 5000 ms',
    );
  });

  it('reports app.reachable false and still returns when checkHealth rejects', async () => {
    const client = localDoor({
      checkHealth: async () => {
        throw new Error('network down');
      },
    });
    const out = await runDiagnostics(client);
    expect(out.app.reachable).toBe(false);
    expect(out._hints?.warnings).toContain(
      'GET https://app.walkeros.io/api/health failed: network down',
    );
  });

  it('reports app.reachable false and still returns when checkHealth is absent', async () => {
    // An external ToolClient implementation may omit the optional checkHealth
    // method; diagnostics must degrade to reachable: false without throwing.
    const { checkHealth: _omit, ...withoutHealth } = localDoor();
    const out = await runDiagnostics(withoutHealth);
    expect(out.app.reachable).toBe(false);
    expect(out._hints?.warnings).toContain('no health check on this client');
  });

  it("reports the client's contract verdict with the bundled contract label", async () => {
    const out = await runDiagnostics();
    expect(out.contract).toEqual({
      openapiVersion: MOCK_CONTRACT_LABEL,
      ...IN_SYNC,
    });
  });

  it('passes an in-process answer through unchanged', async () => {
    const inProcess: ContractComparison = {
      verdict: 'in-process',
      appUrl: 'https://stage.app.walkeros.io',
      client: {
        package: '@walkeros/mcp',
        version: '7.7.7',
        contract: MOCK_CONTRACT_LABEL,
      },
      server: '4.7.0+9f8e7d6c',
    };
    const out = await runDiagnostics(
      stubClient({
        appBaseUrl: () => 'https://stage.app.walkeros.io',
        checkContract: async () => inProcess,
      }),
    );
    expect(out.contract).toEqual({
      openapiVersion: MOCK_CONTRACT_LABEL,
      ...inProcess,
    });
  });

  it('reports unknown for a client without a contract check', async () => {
    const { checkContract: _omit, ...withoutContract } = localDoor();
    const out = await runDiagnostics(withoutContract, '7.7.7');
    expect(out.contract).toEqual({
      openapiVersion: MOCK_CONTRACT_LABEL,
      verdict: 'unknown',
      appUrl: 'https://app.walkeros.io',
      client: {
        package: '@walkeros/mcp',
        version: '7.7.7',
        contract: MOCK_CONTRACT_LABEL,
      },
      reason: 'no contract check on this client',
    });
  });

  it('reports unknown when the contract check throws', async () => {
    const out = await runDiagnostics(
      localDoor({
        checkContract: async () => {
          throw new Error('boom');
        },
      }),
    );
    expect(out.contract.verdict).toBe('unknown');
    expect(out.contract.reason).toBe('contract check failed: boom');
  });

  it.each<ContractComparison['verdict']>([
    'client-outdated',
    'server-older',
    'changed',
    'unknown',
  ])('raises no contract warning on %s', async (verdict) => {
    process.env.WALKEROS_APP_URL = 'https://app.walkeros.io';
    const out = await runDiagnostics(
      localDoor({ checkContract: async () => ({ ...IN_SYNC, verdict }) }),
    );
    expect(out.contract.verdict).toBe(verdict);
    expect(out._hints?.warnings ?? []).toEqual([]);
  });

  it('states facts only in its warnings', async () => {
    const out = await runDiagnostics(
      localDoor({
        checkHealth: async () => ({ reachable: false, error: 'fetch failed' }),
      }),
    );
    const warnings = out._hints?.warnings ?? [];
    expect(warnings).toHaveLength(2);
    for (const warning of warnings) {
      expect(warning).not.toMatch(/\b(run|try|upgrade|check the)\b/i);
    }
  });

  it('reports catalog.lastSource app after an app catalog fetch', async () => {
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        catalog: [
          {
            name: '@walkeros/web-destination-gtag',
            version: '1.0.0',
            type: 'destination',
            platform: ['web'],
          },
        ],
        count: 1,
      }),
    });
    await fetchCatalog({ baseUrl: 'http://app.test' });

    const out = await runDiagnostics();
    expect(out.catalog.lastSource).toBe('app');
    expect(out.catalog.lastCount).toBe(1);
    expect(out.catalog.partial).toBe(false);
  });

  it('reports catalog.lastSource npm and partial when app falls back and drops entries', async () => {
    // app throws → npm fallback; npm lists 2 but only 1 enriches (partial)
    mockApiRequest.mockRejectedValueOnce(new Error('app down'));
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          objects: [
            { package: { name: '@walkeros/a', version: '1.0.0' } },
            { package: { name: '@walkeros/b', version: '1.0.0' } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ $meta: { type: 'destination', platform: 'web' } }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await fetchCatalog({ baseUrl: 'http://app.test' });

    const out = await runDiagnostics();
    expect(out.catalog.lastSource).toBe('npm');
    expect(out.catalog.partial).toBe(true);
  });
});
