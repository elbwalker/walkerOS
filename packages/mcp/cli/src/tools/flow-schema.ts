import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const FLOW_SCHEMA_REFERENCE = {
  structure: {
    version: '1 (required, use 1 for new flows)',
    flows: {
      '<flowName>': {
        'web: {} | server: {}':
          'Platform marker (exactly one, use empty object as value)',
        packages:
          'Record<packageName, {} | { path?, imports? }> — all referenced packages',
        sources:
          'Record<name, { package, config?, env?, next? }> — event capture',
        destinations:
          'Record<name, { package, config?, env?, mapping?, before? }> — event delivery',
        transformers:
          'Record<name, { package, config?, env?, next? }> — event processing',
        stores: 'Record<name, { package, config?, env? }> — key-value storage',
        collector: '{ consent?, globals? } — collector settings (optional)',
      },
    },
    variables: 'Record<string, string> — shared variables (optional)',
    definitions: 'Record<string, object> — reusable definitions (optional)',
    contract: 'Event contract for validation (optional)',
  },
  connectionRules: [
    'Sources have `next` → links to pre-collector transformer chain (e.g., next: "transformerName")',
    'Destinations have `before` → links to post-collector transformer chain (e.g., before: "transformerName")',
    'Transformers have `next` → chains to next transformer (e.g., next: "anotherTransformer")',
    'Stores are passive — injected via `env` values using `$store:storeName` syntax',
    'Mapping on destinations transforms vendor-agnostic events into vendor-specific formats',
  ],
  platformOptions: {
    web: 'Browser environment — uses @walkeros/web-source-browser as default source',
    server:
      'Node.js environment — uses @walkeros/server-source-express as default source',
  },
  minimalExample: {
    version: 1,
    flows: {
      default: {
        web: {},
        packages: {
          '@walkeros/web-source-browser': {},
          '@walkeros/web-destination-gtag': {},
        },
        sources: {
          browser: { package: '@walkeros/web-source-browser', config: {} },
        },
        destinations: {
          gtag: {
            package: '@walkeros/web-destination-gtag',
            config: { measurementId: 'G-XXXXXXXXXX' },
          },
        },
      },
    },
  },
};

export function registerFlowSchemaTool(server: McpServer) {
  server.registerTool(
    'flow_schema',
    {
      title: 'Flow Config Schema',
      description:
        'Returns the annotated Flow.Config structure reference. Shows the valid JSON shape ' +
        'for flow configuration files, connection rules, and a minimal working example.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(FLOW_SCHEMA_REFERENCE, null, 2),
          },
        ],
      };
    },
  );
}
