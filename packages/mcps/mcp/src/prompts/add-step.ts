import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerAddStepPrompt(server: McpServer) {
  server.registerPrompt(
    'add-step',
    {
      description:
        'Add a source, destination, transformer, or store step to a flow configuration. ' +
        'Guides through package selection, config scaffolding, and wiring.',
      argsSchema: {
        stepType: z
          .string()
          .optional()
          .describe(
            'Type of step to add: source, destination, transformer, or store',
          ),
        flowPath: z
          .string()
          .optional()
          .describe('Path to the flow.json file to modify'),
      },
    },
    async ({ stepType, flowPath }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Help me add a ${stepType || 'new'} step to my flow${flowPath ? ` at ${flowPath}` : ''}.`,
              '',
              'Follow these steps:',
              `1. ${stepType ? '' : 'Ask what type of step (source, destination, transformer, store). Then '}Use package_search to browse available packages for the selected type and platform.`,
              '2. Use package_get with section="hints" to read the selected package\'s configuration guidance.',
              '3. Use package_get with section="examples" to see working configuration examples.',
              '4. Scaffold the step config using the package schemas — include required settings with placeholder values.',
              '5. Wire the step into the flow: add to packages section (with version if needed), connect via next/before chains if needed.',
              '6. For destinations: configure mapping using nested entity → action keys. Event "product add" maps to `{ "product": { "add": { name: "AddToCart" } } }`. Use the setup-mapping prompt for guidance.',
              '7. Use flow_validate to verify the result.',
              '',
              'Important:',
              '- Read the walkeros://reference/flow-schema resource to understand connection rules.',
              '- Sources connect to pre-collector transformers via `next`.',
              '- Destinations connect to post-collector transformers via `before`.',
              '- Stores are passive — referenced via `$store:storeName` in env values.',
              '- Use variables ($var) for values that change between environments.',
              '- For required settings without defaults in the package schema, ask the user which value to use. Do not guess credentials, IDs, or environment-specific values.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
