import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerFlowResources(server: McpServer) {
  const template = new ResourceTemplate('walkeros://flow/{flowId}', {
    list: async () => {
      try {
        const { listFlows } = await import('@walkeros/cli');
        const { flows } = await listFlows({});
        return {
          resources: flows.map((f: { id: string; name: string }) => ({
            uri: `walkeros://flow/${f.id}`,
            name: f.name,
            mimeType: 'application/json' as const,
          })),
        };
      } catch {
        return { resources: [] };
      }
    },
  });

  server.registerResource(
    'flow-config',
    template,
    {
      title: 'walkerOS Flow Configuration',
      description: 'Flow configurations from your walkerOS project',
      mimeType: 'application/json',
    },
    async (uri, { flowId }) => {
      const { getFlow } = await import('@walkeros/cli');
      const flow = await getFlow({ flowId: flowId as string });
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json' as const,
            text: JSON.stringify(flow, null, 2),
          },
        ],
      };
    },
  );
}
