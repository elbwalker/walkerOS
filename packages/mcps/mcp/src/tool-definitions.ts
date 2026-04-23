import { z } from 'zod';
import type { ZodRawShape } from 'zod';
import { schemas } from '@walkeros/cli/dev';

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  annotations: ToolAnnotations;
}

/**
 * Declarative registry mirroring the inputSchema + annotations of every tool
 * registered in `createWalkerOSMcpServer`. Use this to bridge tools into
 * non-MCP runtimes (e.g., Vercel AI SDK adapters) without booting an
 * `McpServer`. Tool handlers are not included here, they require a
 * `ToolClient`, which the caller provides.
 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: 'auth',
    title: 'Authentication',
    description:
      'Manage walkerOS authentication. Check login status, log in via device code flow, or log out. ' +
      'No terminal or browser required, the MCP client handles the authorization URL.',
    inputSchema: {
      action: z.enum(['status', 'login', 'logout']),
      deviceCode: z.string().optional(),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'project_manage',
    title: 'Project Management',
    description:
      'Manage walkerOS projects. List, create, update, delete projects, or set a default project for CLI operations.',
    inputSchema: {
      action: z.enum([
        'list',
        'get',
        'create',
        'update',
        'delete',
        'set_default',
      ]),
      projectId: z.string().optional(),
      name: z.string().optional(),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'flow_manage',
    title: 'Flow Management',
    description:
      'Manage walkerOS flows and their previews. List/get/create/update/delete/duplicate flows, or create/inspect/delete preview bundles for testing flow changes on live sites.',
    inputSchema: {
      action: z.enum([
        'list',
        'get',
        'create',
        'update',
        'delete',
        'duplicate',
        'preview_list',
        'preview_get',
        'preview_create',
        'preview_delete',
      ]),
      flowId: z.string().optional(),
      projectId: z.string().optional(),
      name: z.string().optional(),
      content: z.record(z.string(), z.unknown()).optional(),
      patch: z.boolean().optional(),
      fields: z.array(z.string()).optional(),
      sort: z.enum(['name', 'updated_at', 'created_at']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      includeDeleted: z.boolean().optional(),
      previewId: z.string().optional(),
      flowName: z.string().optional(),
      flowSettingsId: z.string().optional(),
      siteUrl: z.string().optional(),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'deploy_manage',
    title: 'Deploy Management',
    description:
      'Deploy walkerOS flows and manage deployments. ' +
      'For get/delete actions pass flowId (required) plus optional slug to disambiguate when a flow has multiple active deployments. ' +
      "If a flow has >=2 active deployments and no slug is supplied, the tool returns a MULTIPLE_DEPLOYMENTS error with a details[] list showing each deployment's slug, type, status, and updatedAt.",
    inputSchema: {
      action: z.enum(['deploy', 'list', 'get', 'delete']),
      projectId: z.string().optional(),
      flowId: z.string().optional(),
      slug: z.string().optional(),
      type: z.enum(['web', 'server']).optional(),
      status: z.string().optional(),
      wait: z.boolean().optional(),
      flowName: z.string().optional(),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'flow_validate',
    title: 'Validate Flow',
    description:
      'Validate walkerOS events, flow configurations, mapping rules, or data contracts. ' +
      'Accepts JSON strings, file paths, or URLs as input. ' +
      'Returns validation results with errors, warnings, and details.',
    inputSchema: schemas.ValidateInputShape as unknown as ZodRawShape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'flow_bundle',
    title: 'Bundle Flow',
    description:
      'Bundle a walkerOS flow configuration into deployable JavaScript. ' +
      'Resolves all destinations, sources, and transformers, then outputs ' +
      'a tree-shaken production bundle. Returns bundle statistics. ' +
      'Set remote: true to use the walkerOS cloud service instead of local build tools.',
    inputSchema: {
      ...(schemas.BundleInputShape as ZodRawShape),
      remote: z.boolean().optional(),
      content: z.record(z.string(), z.unknown()).optional(),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'flow_simulate',
    title: 'Simulate Flow',
    description:
      'Simulate events through a walkerOS flow without making real API calls. ' +
      'For destinations: event is a walkerOS event { name: "entity action", data: {...} }. ' +
      'For sources: event is { content: ..., trigger?: { type?, options? }, env?: {...} }. ' +
      'Use step to target a specific step. ' +
      'Use flow_examples to discover available test data. ' +
      'IMPORTANT: Destinations with require (e.g. require: ["consent"]) stay pending until ' +
      'that collector event fires, simulation will error "not found" if require is not satisfied. ' +
      'Remove require from config or provide consent/user events before simulating. ' +
      'Separately, destinations with consent (e.g. consent: { marketing: true }) only receive ' +
      'events where the event includes matching consent. ' +
      'Mapping transforms event names and data at the destination level. ' +
      'Policy redacts or injects fields before mapping runs.',
    inputSchema: {
      configPath: schemas.SimulateInputShape.configPath,
      event: z
        .union([z.record(z.string(), z.unknown()), z.string()])
        .optional(),
      flow: schemas.SimulateInputShape.flow,
      platform: schemas.SimulateInputShape.platform,
      step: schemas.SimulateInputShape.step,
      verbose: z.boolean().optional(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'flow_push',
    title: 'Push Events',
    description:
      'Push a real event through a walkerOS flow to actual destinations. ' +
      'Makes real API calls to real endpoints. ' +
      'Best suited for server-side flows, web flows should use flow_simulate for testing.',
    inputSchema: {
      configPath: schemas.PushInputShape.configPath,
      event: z.record(z.string(), z.unknown()),
      flow: schemas.PushInputShape.flow,
      platform: schemas.PushInputShape.platform,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'flow_examples',
    title: 'Flow Examples',
    description:
      'List all step examples in a walkerOS flow configuration. ' +
      'Shows example names, step locations, and in/out shapes. ' +
      'Use this to discover available test fixtures and simulation data.',
    inputSchema: {
      configPath: z.string().min(1),
      flow: z.string().optional(),
      step: z.string().optional(),
      full: z.boolean().optional(),
      includeHidden: z.boolean().optional(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'flow_load',
    title: 'Load or Create Flow',
    description:
      'Load an existing flow configuration from a local file path, URL, or walkerOS API (by flow ID). ' +
      'Or create a new empty flow by specifying a platform (web or server). ' +
      'Use the add-step prompt to add sources, destinations, transformers, or stores to the flow.',
    inputSchema: {
      source: z.string().optional(),
      platform: z.enum(['web', 'server']).optional(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'package_search',
    title: 'Search Package',
    description:
      'Start here for package discovery. Never guess package names, use this tool first to find exact names. ' +
      'Without package name: returns catalog filtered by type/platform. ' +
      'With package name: returns metadata, hint keys, and example summaries.',
    inputSchema: {
      package: z.string().min(1).optional(),
      type: z
        .enum(['source', 'destination', 'transformer', 'store'])
        .optional(),
      platform: z.enum(['web', 'server']).optional(),
      version: z.string().optional(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'package_get',
    title: 'Get Package',
    description:
      'Requires exact package name, do not guess names, use package_search first to find them. ' +
      'Returns schemas + hint texts + example summaries by default (lightweight). ' +
      'Use section parameter for full content: "hints" (with code blocks), "examples" (full in/out data), or "all".',
    inputSchema: {
      package: z.string().min(1),
      version: z.string().optional(),
      section: z.enum(['hints', 'examples', 'all']).optional(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'feedback',
    title: 'Send Feedback',
    description: 'Send feedback about walkerOS',
    inputSchema: {
      text: z.string(),
      anonymous: z.boolean().optional(),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
] as const;
