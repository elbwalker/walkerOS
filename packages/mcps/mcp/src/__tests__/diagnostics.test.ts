import './support/version.js';

// Mock @walkeros/cli to keep its ESM-only transitive deps (chalk) out of the
// transform path. The diagnostics tool reads VERSION and compareContract from
// it; the app URL no longer comes from the CLI at all, it comes from the
// client, which `localDoor` below stands in for.
const MOCK_CLI_VERSION = '5.4.3-test';
const mockCompareContract = jest.fn();
jest.mock('@walkeros/cli', () => ({
  VERSION: '5.4.3-test',
  // Forwards its input: the tool has to hand the probe the same backend it
  // prints as appUrl.resolved, and a mock that swallowed the argument could
  // not tell a threaded URL from none at all.
  compareContract: (input: unknown) => mockCompareContract(input),
}));

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { createDiagnosticsToolSpec } from '../tools/diagnostics.js';
import { stubClient } from './support/stub-client.js';
import type { ToolClient } from '../tool-client.js';
import { normalizeBaseUrl } from '../base-url.js';
import { clearCatalogCache, fetchCatalog } from '../catalog.js';
import { SERVER_INSTRUCTIONS } from '../instructions.js';

const CLI_VERSION = MOCK_CLI_VERSION;

// Mirror the tool's spec-version resolution: the subpath is not in the CLI's
// exports map, so resolve the package main and navigate to openapi/spec.json.
const require = createRequire(import.meta.url);
const specPath = join(
  dirname(require.resolve('@walkeros/cli')),
  '..',
  'openapi',
  'spec.json',
);
const specJson = JSON.parse(readFileSync(specPath, 'utf-8')) as {
  info: { version: string };
};

interface DiagnosticsResult {
  mcp: { version: string };
  cli: { version: string };
  appUrl: { resolved: string; source: 'env' | 'default' };
  app: { reachable: boolean; status?: string };
  contract: {
    openapiVersion: string;
    verdict: 'in-sync' | 'client-older' | 'client-newer' | 'unknown';
    action?: string;
  };
  catalog: { lastSource?: string; lastCount?: number; partial?: boolean };
  _hints?: { next?: string[]; warnings?: string[] };
}

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
    ...overrides,
  });
}

async function runDiagnostics(
  client = localDoor(),
  packageVersion = '7.7.7',
): Promise<DiagnosticsResult> {
  const spec = createDiagnosticsToolSpec(client, packageVersion);
  const result = (await spec.handler({})) as {
    structuredContent: DiagnosticsResult;
  };
  return result.structuredContent;
}

describe('diagnostics tool', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearCatalogCache();
    global.fetch = mockFetch;
    delete process.env.WALKEROS_APP_URL;
    // Default: in-sync verdict so existing assertions are unaffected.
    mockCompareContract.mockResolvedValue({
      verdict: 'in-sync',
      bakedVersion: '1.0.0',
      liveVersion: '1.0.0',
    });
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
    expect(out._hints?.warnings?.some((w) => /WALKEROS_APP_URL/.test(w))).toBe(
      true,
    );
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

  it('reports app.reachable false and still returns when checkHealth rejects', async () => {
    const client = localDoor({
      checkHealth: async () => {
        throw new Error('network down');
      },
    });
    const out = await runDiagnostics(client);
    expect(out.app.reachable).toBe(false);
    expect(out._hints?.warnings?.some((w) => /unreachable/i.test(w))).toBe(
      true,
    );
  });

  it('reports app.reachable false and still returns when checkHealth is absent', async () => {
    // An external ToolClient implementation may omit the optional checkHealth
    // method; diagnostics must degrade to reachable: false without throwing.
    const { checkHealth: _omit, ...withoutHealth } = localDoor();
    const out = await runDiagnostics(withoutHealth);
    expect(out.app.reachable).toBe(false);
    expect(
      out._hints?.warnings?.some((w) => /health check is unavailable/i.test(w)),
    ).toBe(true);
  });

  it('reports the bundled contract openapi version', async () => {
    const out = await runDiagnostics();
    expect(out.contract.openapiVersion).toBe(specJson.info.version);
  });

  it('reports the contract drift verdict and action from compareContract', async () => {
    mockCompareContract.mockResolvedValue({
      verdict: 'client-older',
      bakedVersion: '1.0.0',
      liveVersion: '1.3.0',
      action: 'upgrade @walkeros/cli to >= 1.3.0',
    });
    const out = await runDiagnostics();
    expect(out.contract.verdict).toBe('client-older');
    expect(out.contract.action).toBe('upgrade @walkeros/cli to >= 1.3.0');
  });

  it('probes the contract at the app URL it reports, not a self-resolved one', async () => {
    // The hosted door is served on its own URL and has no CLI config file, so
    // a probe left to resolve itself would read the local machine and report a
    // verdict about production. Two answers in one response must not describe
    // two different backends.
    process.env.WALKEROS_APP_URL = 'https://app.test';
    const out = await runDiagnostics(
      stubClient({ appBaseUrl: () => 'https://stage.app.walkeros.io' }),
    );
    expect(mockCompareContract).toHaveBeenCalledWith({
      baseUrl: 'https://stage.app.walkeros.io',
    });
    expect(out.appUrl.resolved).toBe('https://stage.app.walkeros.io');
  });

  it('degrades the verdict to unknown when compareContract reports unreachable', async () => {
    mockCompareContract.mockResolvedValue({
      verdict: 'unknown',
      bakedVersion: '1.0.0',
    });
    const out = await runDiagnostics();
    expect(out.contract.verdict).toBe('unknown');
    expect(out.contract.action).toBeUndefined();
  });

  it('degrades the verdict to unknown when compareContract throws', async () => {
    mockCompareContract.mockRejectedValue(new Error('boom'));
    const out = await runDiagnostics();
    expect(out.contract.verdict).toBe('unknown');
  });

  it('reports catalog.lastSource app after an app catalog fetch', async () => {
    mockFetch.mockResolvedValueOnce({
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
    mockFetch
      .mockRejectedValueOnce(new Error('app down'))
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
