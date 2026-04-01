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
              '2. Use package_get to read the package\'s config schema (schemas.config contains the full config shape: base fields like consent/require/logger + package-specific settings). Use section="hints" for additional guidance.',
              '3. Use package_get with section="examples" to see working configuration examples.',
              '4. Scaffold the step config using the package schemas — include required settings with placeholder values.',
              '5. Wire the step into the flow: add to packages section (with version if needed), connect via next/before chains if needed.',
              '6. For destinations: configure mapping using nested entity → action keys. Event "product add" maps to `{ "product": { "add": { name: "AddToCart" } } }`. Use the setup-mapping prompt for guidance.',
              '7. For destinations: if consent-gated loading is needed, add require: ["consent"] to config. ' +
                'Note: require delays initialization until a "walker consent" event fires. ' +
                'When simulating with flow_simulate, destinations with require will error "not found" — ' +
                'remove require temporarily or test without it. ' +
                'For per-event consent filtering, add consent: { marketing: true } to config.',
              '8. Use flow_validate to verify the result.',
              '9. For server sources: check if the package supports `ingest` configuration via package_get. Ingest extracts request metadata (IP, user-agent, headers) using mapping syntax. Transformers like fingerprint depend on ingest data.',
              '10. When adding a transformer that uses ingest fields, verify the source has `ingest` configured — otherwise ingest fields resolve to empty values.',
              '',
              'Important:',
              '- Read the walkeros://reference/flow-schema resource to understand connection rules.',
              '- Sources connect to pre-collector transformers via `next`.',
              '- Destinations connect to post-collector transformers via `before`.',
              '- Stores are passive — referenced via `$store:storeName` in env values.',
              '- Use variables ($var) for values that change between environments.',
              '- For required settings without defaults in the package schema, ask the user which value to use. Do not guess credentials, IDs, or environment-specific values.',
              '- If $meta.exports lists named exports, set the `code` field on the step to the chosen export name. If only one export exists, use it automatically.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
