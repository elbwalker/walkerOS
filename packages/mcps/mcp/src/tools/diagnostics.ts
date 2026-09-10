import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult } from '@walkeros/core';
import { VERSION as CLI_VERSION, compareContract } from '@walkeros/cli';
import type { ContractComparison } from '@walkeros/cli';
import openapiSpec from '@walkeros/cli/openapi/spec.json';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import { getPackageBaseUrl, getLastCatalogSource } from '../catalog.js';
import { normalizeBaseUrl } from '../base-url.js';

// The bundled OpenAPI contract version, embedded at build time via the import
// above (no runtime module resolution). This is the client's bundled baseline,
// not the live backend's spec.
const CONTRACT_OPENAPI_VERSION: string = openapiSpec.info.version;

const TITLE = 'Diagnostics';
const DESCRIPTION =
  'Report the MCP runtime surface: MCP and CLI versions, the resolved app URL ' +
  'and its source, app /api/health reachability, the bundled OpenAPI contract ' +
  'version, and which source served the last package catalog fetch. ' +
  'Read-only and callable when logged out; use it when a request fails to see ' +
  'which versions and backend you are on.';

// No input fields: diagnostics is callable with `{}`, including logged out.
const inputSchema = {};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function createDiagnosticsToolSpec(
  client: ToolClient,
  packageVersion: string,
): ToolSpec {
  return {
    name: 'diagnostics',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: () => diagnosticsHandlerBody(client, packageVersion),
  };
}

async function diagnosticsHandlerBody(
  client: ToolClient,
  packageVersion: string,
) {
  // The backend comes from the CLIENT, never from the local CLI: the local
  // door resolves the user's machine, the hosted door is served by the app it
  // reports, and a tool that resolved this itself would name the wrong backend
  // on one of them.
  const resolved = client.appBaseUrl();

  // Provenance via the same helper the catalog uses; do not add a parallel
  // process.env check. It is a claim about the OVERRIDE only, and a proven
  // one: `env` means this process's WALKEROS_APP_URL is the URL the client
  // actually named. A client that ignores the variable (the hosted door does,
  // it is served on its own URL) therefore never reports `env` merely because
  // the variable happens to be set in its environment.
  // Normalized on both sides of the comparison: `resolved` is a base without a
  // trailing slash, and the env var is under no such obligation, so comparing
  // raw would report `default` for a slashed value that did set the URL.
  const envAppUrl = getPackageBaseUrl();
  const appUrlSource: 'env' | 'default' =
    envAppUrl !== undefined && normalizeBaseUrl(envAppUrl) === resolved
      ? 'env'
      : 'default';

  // checkHealth is optional on ToolClient: clients that cannot probe
  // reachability omit it, in which case diagnostics degrades to
  // { reachable: false }. When present, its contract is to resolve
  // { reachable: false } on failure, but catch here too so a throwing client
  // never breaks diagnostics.
  const health: { reachable: boolean; status?: string } = client.checkHealth
    ? await client.checkHealth().catch(() => ({ reachable: false }))
    : { reachable: false };
  const healthUnavailable = !client.checkHealth;

  // Contract drift verdict: compare the client's baked baseline against the
  // live app's /api/health. The probe gets the SAME `resolved` this response
  // prints as appUrl.resolved, never its own resolution: left to itself it
  // reads the local machine (WALKEROS_APP_URL, the CLI config file on disk,
  // then a hardcoded production default), so a hosted door, which has no CLI
  // config, would report a verdict about a backend it is not served by. Two
  // answers in one response must not describe two different backends.
  // `resolved` is already free of a trailing slash (ToolClient.appBaseUrl
  // promises that, and both doors normalize), so no normalizeBaseUrl here.
  // Degrade to 'unknown' if the probe throws so a network blip never breaks
  // diagnostics.
  const contractComparison: ContractComparison = await compareContract({
    baseUrl: resolved,
  }).catch(() => ({
    verdict: 'unknown' as const,
    bakedVersion: CONTRACT_OPENAPI_VERSION,
  }));

  const catalogInfo = getLastCatalogSource();

  const warnings: string[] = [];
  if (appUrlSource === 'default') {
    warnings.push(
      'WALKEROS_APP_URL did not set the app URL; appUrl.resolved is the backend the client resolved on its own. On a local MCP, set WALKEROS_APP_URL to target a specific backend.',
    );
  }
  if (healthUnavailable) {
    warnings.push(
      'health check is unavailable on this client; app reachability is reported as false.',
    );
  } else if (!health.reachable) {
    warnings.push(
      `app /api/health is unreachable at ${resolved}; check the URL, network, and that the app is running.`,
    );
  }
  if (
    contractComparison.verdict === 'client-older' &&
    contractComparison.action
  ) {
    warnings.push(
      `client contract is behind the server: ${contractComparison.action}.`,
    );
  }

  const result = {
    mcp: { version: packageVersion },
    cli: { version: CLI_VERSION },
    appUrl: { resolved, source: appUrlSource },
    // app.version is intentionally omitted: the CLI's generated HealthResponse
    // is { status } only, so it is not a typed field here.
    app: {
      reachable: health.reachable,
      ...(health.status !== undefined && { status: health.status }),
    },
    contract: {
      openapiVersion: CONTRACT_OPENAPI_VERSION,
      verdict: contractComparison.verdict,
      ...(contractComparison.action !== undefined && {
        action: contractComparison.action,
      }),
    },
    catalog: catalogInfo
      ? {
          lastSource: catalogInfo.source,
          lastCount: catalogInfo.count,
          partial: catalogInfo.partial,
        }
      : { lastSource: undefined, lastCount: undefined, partial: undefined },
  };

  return mcpResult(result, warnings.length > 0 ? { warnings } : undefined);
}

export function registerDiagnosticsTool(
  server: McpServer,
  client: ToolClient,
  packageVersion: string,
) {
  const spec = createDiagnosticsToolSpec(client, packageVersion);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
