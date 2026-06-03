import './support/version.js';

// Mock @walkeros/cli to keep its ESM-only transitive deps (chalk) out of the
// transform path. The diagnostics tool reads VERSION + resolveAppUrl from it;
// resolveAppUrl mirrors the real env-vs-default precedence so the appUrl
// assertions exercise real provenance logic.
const MOCK_CLI_VERSION = '5.4.3-test';
jest.mock('@walkeros/cli', () => ({
  VERSION: '5.4.3-test',
  resolveAppUrl: () =>
    process.env.WALKEROS_APP_URL ?? 'https://app.walkeros.io',
}));

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { createDiagnosticsToolSpec } from '../tools/diagnostics.js';
import { stubClient } from './support/stub-client.js';
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
  contract: { openapiVersion: string };
  catalog: { lastSource?: string; lastCount?: number; partial?: boolean };
  _hints?: { next?: string[]; warnings?: string[] };
}

async function runDiagnostics(
  client = stubClient(),
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

  it('reports app.reachable true when checkHealth resolves reachable', async () => {
    const client = stubClient({
      checkHealth: async () => ({ reachable: true, status: 'ok' }),
    });
    const out = await runDiagnostics(client);
    expect(out.app.reachable).toBe(true);
    expect(out.app.status).toBe('ok');
  });

  it('reports app.reachable false and still returns when checkHealth rejects', async () => {
    const client = stubClient({
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

  it('reports the bundled contract openapi version', async () => {
    const out = await runDiagnostics();
    expect(out.contract.openapiVersion).toBe(specJson.info.version);
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
