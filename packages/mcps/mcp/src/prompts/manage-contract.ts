import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerManageContractPrompt(server: McpServer) {
  server.registerPrompt(
    'manage-contract',
    {
      description:
        'Create or update event contracts for a flow. Can generate contracts from existing mappings or scaffold mappings from contracts.',
      argsSchema: {
        direction: z
          .string()
          .optional()
          .describe(
            'Direction: "from-mappings" (extract contract from existing mappings), ' +
              '"from-scratch" (create new contract), or "to-mappings" (scaffold mappings from contract)',
          ),
      },
    },
    async ({ direction }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Help me ${direction === 'to-mappings' ? 'scaffold mappings from a contract' : direction === 'from-mappings' ? 'generate a contract from existing mappings' : 'manage event contracts'}.`,
              '',
              'Follow these steps:',
              '1. Read the walkeros://reference/contract resource to understand contract structure.',
              direction === 'from-mappings'
                ? '2. Read all destination mappings in the flow, extract referenced event fields, and generate a contract with those as required properties.'
                : direction === 'to-mappings'
                  ? '2. Read the contract from the flow, then scaffold mapping stubs for each destination based on the contract fields.'
                  : '2. Ask for entity-action names and required properties, or ask whether to generate from existing mappings.',
              '3. Use entity-action keying with wildcards (*.*, *.action, entity.*) for broad rules.',
              '4. Define JSON Schema for events, globals, context, custom, user, and consent.',
              '5. Use flow_validate to verify the contract.',
              '',
              'Contracts and mappings are bidirectional:',
              '- **Contract → Mappings**: contract defines what events look like, mappings are scaffolded to match.',
              '- **Mappings → Contract**: existing mappings reveal which fields are used, contract formalizes them.',
              '',
              'Use $contract.name references to link contracts in the flow.',
              'Contracts support extends for inheritance between event types.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
