import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerSetupMappingPrompt(server: McpServer) {
  server.registerPrompt(
    'setup-mapping',
    {
      description:
        'Set up event mapping for any step in a flow. Teaches mapping syntax and uses package examples as templates.',
      argsSchema: {
        stepName: z
          .string()
          .optional()
          .describe('Step name in the flow (e.g., "gtag", "meta", "express")'),
      },
    },
    async ({ stepName }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Help me set up mapping${stepName ? ` for the "${stepName}" step` : ''}.`,
              '',
              'Follow these steps:',
              '1. Read the walkeros://reference/mapping resource to understand mapping syntax.',
              `2. ${stepName ? `Identify the package for "${stepName}" in the flow, then u` : 'U'}se package_get with section="examples" to see how events are mapped for this package.`,
              '3. Ask which events I want to map (e.g., "product view", "order complete").',
              '4. Generate mapping rules using the package examples as templates.',
              '5. Use flow_validate to verify the mapping.',
              '',
              'Mapping operates at two levels:',
              '- **Source mapping**: normalizes raw input → walkerOS events',
              '- **Destination mapping**: transforms walkerOS events → vendor format',
              '',
              'Key mapping operators: data (extract), map (object transform), loop (array processing), ',
              'set (create array), fn ($code function), condition (conditional), consent (consent-gated).',
              '',
              'Use $def references for shared mapping patterns across destinations.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
