import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult } from '@walkeros/core';
import {
  VERSION as CLI_VERSION,
  bakedContractVersion,
  operationUrl,
} from '@walkeros/cli';
import type { ContractComparison } from '@walkeros/cli';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import { getPackageBaseUrl, getLastCatalogSource } from '../catalog.js';
import { normalizeBaseUrl } from '../base-url.js';

const TITLE = 'Diagnostics';
const DESCRIPTION =
  'Report the MCP runtime surface: MCP and CLI versions, the resolved app URL ' +
  'and its source, app /api/health reachability, the API contract verdict ' +
  'against that app, and which source served the last package catalog fetch. ' +
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
  const healthCheck: Promise<{
    reachable: boolean;
    status?: string;
    version?: string;
    error?: string;
  }> = client.checkHealth
    ? client.checkHealth().catch((error: unknown) => ({
        reachable: false,
        error: errorMessage(error),
      }))
    : Promise.resolve({ reachable: false });

  // The contract verdict comes from the CLIENT, like the URL: the local door
  // compares per operation against the app it resolves, a hosted door served
  // inside the app answers `in-process`. A client without the method, or one
  // that throws, yields `unknown` with the reason.
  const contractCheck: Promise<ContractComparison> = client.checkContract
    ? client
        .checkContract()
        .catch((error: unknown) =>
          unknownContract(
            resolved,
            packageVersion,
            `contract check failed: ${errorMessage(error)}`,
          ),
        )
    : Promise.resolve(
        unknownContract(
          resolved,
          packageVersion,
          'no contract check on this client',
        ),
      );

  const [health, contract] = await Promise.all([healthCheck, contractCheck]);

  const catalogInfo = getLastCatalogSource();

  const warnings: string[] = [];
  if (envAppUrl === undefined) {
    warnings.push(`WALKEROS_APP_URL is not set; app URL from ${appUrlSource}`);
  }
  if (!client.checkHealth) {
    warnings.push('no health check on this client');
  } else if (!health.reachable) {
    const url = operationUrl('GET /api/health', { baseUrl: resolved });
    warnings.push(`GET ${url} failed: ${health.error ?? 'no response'}`);
  }

  const result = {
    mcp: { version: packageVersion },
    cli: { version: CLI_VERSION },
    appUrl: { resolved, source: appUrlSource },
    app: {
      reachable: health.reachable,
      ...(health.status !== undefined && { status: health.status }),
      ...(health.version !== undefined && { version: health.version }),
    },
    contract: { openapiVersion: bakedContractVersion, ...contract },
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The `unknown` verdict this MCP reports when its client gives none. */
function unknownContract(
  appUrl: string,
  packageVersion: string,
  reason: string,
): ContractComparison {
  return {
    verdict: 'unknown',
    appUrl,
    client: {
      package: '@walkeros/mcp',
      version: packageVersion,
      contract: bakedContractVersion,
    },
    reason,
  };
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
    () => diagnosticsHandlerBody(client, packageVersion),
  );
}
