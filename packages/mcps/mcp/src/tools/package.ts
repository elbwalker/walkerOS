import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackage, mcpResult, mcpError } from '@walkeros/core';
import { mergeConfigSchema } from '@walkeros/core/dev';
import {
  fetchCatalog,
  normalizePlatform,
  getPackageBaseUrl,
  CLIENT_HEADER,
} from '../catalog.js';

import type { ToolSpec } from '../tool-spec.js';
import { recordField, stringField } from './narrow.js';
import { parseToolInput } from './parse-input.js';

// `getPackageBaseUrl` lives in ../catalog.js because both these tools and the
// catalog resources resolve the same app-primary base URL. Re-exported here so
// existing importers of `tools/package.js` keep working.
export { getPackageBaseUrl };

// ---------- package_search ----------

const SEARCH_TITLE = 'Search Package';
const SEARCH_DESCRIPTION =
  'Start here for package discovery. Never guess package names: use this tool first to find exact names. ' +
  'Without package name: returns catalog filtered by type/platform. ' +
  'With package name: returns metadata, hint keys, and example summaries.';

const searchInputSchema = {
  package: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Exact npm package name for detailed lookup (e.g., @walkeros/web-destination-snowplow)',
    ),
  type: z
    .enum(['source', 'destination', 'transformer', 'store'])
    .optional()
    .describe('Filter by package type (browse mode)'),
  platform: z
    .enum(['web', 'server'])
    .optional()
    .describe('Filter by platform (browse mode, includes universal packages)'),
  version: z
    .string()
    .optional()
    .describe('Package version for detailed lookup (default: latest)'),
};

const searchAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createPackageSearchToolSpec(): ToolSpec {
  return {
    name: 'package_search',
    title: SEARCH_TITLE,
    description: SEARCH_DESCRIPTION,
    inputSchema: searchInputSchema,
    annotations: searchAnnotations,
    handler: (input) => packageSearchHandlerBody(input),
  };
}

async function packageSearchHandlerBody(input: unknown) {
  const parsed = parseToolInput(searchInputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { package: packageName, type, platform, version } = parsed.data;
  const baseUrl = getPackageBaseUrl();

  // Browse mode: no package specified → return catalog
  if (!packageName) {
    const { entries, warnings } = await fetchCatalog({
      type,
      platform,
      baseUrl,
    });
    const result = { catalog: entries, count: entries.length };
    return mcpResult(result, {
      next: ['Use package_get for schemas and examples'],
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  }

  // Lookup mode: fetch specific package details
  try {
    const info = await fetchPackage(packageName, {
      version,
      baseUrl,
      client: CLIENT_HEADER,
    });

    const result = {
      package: info.packageName,
      version: info.version,
      description: info.description,
      type: info.type,
      platform: normalizePlatform(info.platform),
      hintKeys: info.hintKeys,
      exampleSummaries: info.exampleSummaries,
    };

    return mcpResult(result, {
      next: ['Use package_get for schemas and examples'],
    });
  } catch (error) {
    return mcpError(
      error,
      'Package not found. Use package_search without parameters to browse available packages.',
    );
  }
}

export function registerPackageSearchTool(server: McpServer) {
  const spec = createPackageSearchToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // No outputSchema: browse mode returns {catalog, count}, lookup returns metadata — incompatible shapes
      annotations: spec.annotations,
    },
    (args) => packageSearchHandlerBody(args),
  );
}

// ---------- package_get ----------

const GET_TITLE = 'Get Package';
const GET_DESCRIPTION =
  'Requires exact package name: do not guess names, use package_search first to find them. ' +
  'Returns schemas + hint texts + example summaries by default (lightweight). ' +
  'Use section parameter for full content: "hints" (with code blocks), "examples" (full in/out data), or "all".';

const getInputSchema = {
  package: z
    .string()
    .min(1)
    .describe(
      'Exact npm package name (e.g., @walkeros/web-destination-snowplow)',
    ),
  version: z.string().optional().describe('Package version (default: latest)'),
  section: z
    .enum(['hints', 'examples', 'all'])
    .optional()
    .describe(
      'Section to expand with full content. Default: summary view with schemas + hint texts + example descriptions',
    ),
};

const getAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function createPackageGetToolSpec(): ToolSpec {
  return {
    name: 'package_get',
    title: GET_TITLE,
    description: GET_DESCRIPTION,
    inputSchema: getInputSchema,
    annotations: getAnnotations,
    handler: (input) => packageGetHandlerBody(input),
  };
}

const STEP_PACKAGE_TYPES = [
  'source',
  'destination',
  'transformer',
  'store',
] as const;

function isStepPackageType(
  type: string | undefined,
): type is (typeof STEP_PACKAGE_TYPES)[number] {
  return STEP_PACKAGE_TYPES.some((stepType) => stepType === type);
}

/**
 * Base config merged with the package settings as `config`; every other
 * schema (mapping, setup, ga4, ...) kept as a sibling.
 */
function shapeSchemas(
  type: string | undefined,
  schemas: Record<string, unknown>,
): Record<string, unknown> {
  const shaped: Record<string, unknown> = {};

  if (isStepPackageType(type)) {
    const settings = recordField(schemas, 'settings');
    const credentials = recordField(schemas, 'credentials');
    shaped.config = mergeConfigSchema(type, {
      ...schemas,
      settings,
      credentials,
    });
  }

  for (const [key, value] of Object.entries(schemas)) {
    if (key !== 'settings') shaped[key] = value;
  }
  return shaped;
}

async function packageGetHandlerBody(input: unknown) {
  const parsed = parseToolInput(getInputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { package: packageName, version, section } = parsed.data;
  const baseUrl = getPackageBaseUrl();

  try {
    const info = await fetchPackage(packageName, {
      version,
      baseUrl,
      client: CLIENT_HEADER,
    });

    const result: Record<string, unknown> = {
      package: info.packageName,
      version: info.version,
      type: info.type,
      platform: normalizePlatform(info.platform),
      schemas: shapeSchemas(info.type, info.schemas),
    };

    // Multi-export packages: schemas per export, each with its own config
    if (info.exportSchemas) {
      result.exportSchemas = Object.fromEntries(
        Object.entries(info.exportSchemas).map(([name, schemas]) => [
          name,
          shapeSchemas(info.type, schemas),
        ]),
      );
    }

    // Hints
    if (info.hints) {
      if (section === 'hints' || section === 'all') {
        result.hints = info.hints;
      } else {
        const hintSummary: Record<string, { text: string }> = {};
        for (const [key, hint] of Object.entries(info.hints)) {
          const text = stringField(hint, 'text');
          if (text !== undefined) hintSummary[key] = { text };
        }
        result.hints = hintSummary;
      }
    }

    // Examples
    if (section === 'examples' || section === 'all') {
      result.examples = info.examples;
      // Multi-export packages: examples per export, keyed by export name
      if (info.exportExamples) result.exportExamples = info.exportExamples;
    } else {
      result.exampleSummaries = info.exampleSummaries;
    }

    return mcpResult(result);
  } catch (error) {
    return mcpError(
      error,
      'Use package_search to browse available package names.',
    );
  }
}

export function registerGetPackageSchemaTool(server: McpServer) {
  const spec = createPackageGetToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // No outputSchema: removed to avoid SDK -32602 crashes on unexpected field values
      annotations: spec.annotations,
    },
    (args) => packageGetHandlerBody(args),
  );
}
