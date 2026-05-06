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
              '1. Read the walkeros://reference/mapping resource for syntax reference.',
              `2. ${stepName ? `Identify the package for "${stepName}" in the flow, then u` : 'U'}se package_get with section="examples" to see the source output shape — mapping keys must match the actual events the source emits.`,
              '3. Ask whether this is source mapping (raw input → walkerOS events) or destination mapping (walkerOS events → vendor format).',
              '4. Ask which events to map (one at a time, not all at once).',
              '5. Generate one mapping rule using the package examples as templates. Validate it with flow_validate before moving to the next.',
              '6. Repeat for each event.',
              '',
              'Mapping uses nested entity → action keys. Event "product add" maps to `{ "product": { "add": Rule } }`. Wildcards: `{ "*": { "view": Rule } }`.',
              '',
              'Extract shared mapping shapes into variables, reference via $var.name (deep paths supported).',
              '',
              'Policy and consent in mapping:',
              '- config.policy runs BEFORE mapping rules — use it to inject or redact fields on the event.',
              '- rule.policy runs after config.policy but before data transformation — use for event-specific pre-processing.',
              '- config.consent gates ALL events to this destination. rule.consent gates specific event types.',
              '- Individual value configs support consent: { marketing: true } for field-level gating.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
