import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerUseDefinitionsPrompt(server: McpServer) {
  server.prompt(
    'use-definitions',
    {
      description:
        'Extract shared patterns into definitions and variables for DRY, environment-aware flow configurations.',
      arguments: [
        {
          name: 'flowPath',
          description: 'Path to the flow.json file to analyze',
          required: false,
        },
      ],
    },
    async ({ flowPath }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Help me extract shared patterns into definitions and variables${flowPath ? ` in ${flowPath}` : ''}.`,
              '',
              'Follow these steps:',
              '1. Read the walkeros://reference/variables resource to understand variable syntax.',
              '2. Analyze the flow config for repeated patterns (same mapping blocks, same config values).',
              '3. Extract repeated mapping patterns into the `definitions` section with `$def.name` references.',
              '4. Extract environment-specific values into `variables` with `$var.name` references.',
              '5. Show the cascade priority: step > settings > config.',
              '6. Use flow_validate to verify the result.',
              '',
              'Variable types:',
              '- `$var.name` — variable substitution (cascade: step > settings > config)',
              '- `$env.NAME` and `$env.NAME:default` — environment variables',
              '- `$def.name` and `$def.name.path.deep` — definition references',
              '- `$contract.name` — contract references',
              '- `$code:(expr)` — inline JavaScript functions',
              '- `$store:storeId` — store injection in env values',
              '',
              'Look for:',
              '- Same API keys or URLs across multiple destinations → $var or $env',
              '- Identical mapping rules in multiple destinations → $def',
              '- Environment-specific values (dev/staging/prod) → $var with overrides',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
