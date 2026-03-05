import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { createTagger } from '@walkeros/web-source-browser';
import { GenerateTaggingOutputShape } from '../schemas/output.js';

export function registerGenerateTool(server: McpServer) {
  server.registerTool(
    'generate_tagging',
    {
      title: 'Generate Tagging',
      description:
        'Generate walkerOS data-elb HTML attributes from structured input. ' +
        'Returns attribute key-value pairs and an example HTML snippet.',
      inputSchema: {
        entity: z
          .string()
          .optional()
          .describe(
            'Entity name (creates data-elb="entity" and scopes data-elb-entity properties)',
          ),
        data: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe('Entity properties as key:value pairs'),
        action: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            'Trigger:action pairs for data-elbaction (nearest entity only)',
          ),
        actions: z
          .record(z.string(), z.string())
          .optional()
          .describe('Trigger:action pairs for data-elbactions (all entities)'),
        context: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe('Context properties for data-elbcontext'),
        globals: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe('Global properties for data-elbglobals'),
        link: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            'Link relationships for data-elblink (id:type, e.g. {"details":"parent"})',
          ),
        prefix: z
          .string()
          .optional()
          .describe('Custom prefix (default: data-elb)'),
      },
      outputSchema: GenerateTaggingOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({
      entity,
      data,
      action,
      actions,
      context,
      globals,
      link,
      prefix,
    }) => {
      try {
        const hasInput =
          entity || data || action || actions || context || globals || link;
        if (!hasInput) {
          return mcpError(
            new Error(
              'Provide at least one parameter (entity, data, action, etc.)',
            ),
          );
        }

        const tagger = createTagger(prefix ? { prefix } : undefined);
        // Pass entity to factory (sets naming scope) and call .entity() (creates data-elb attr)
        const t = tagger(entity);
        if (entity) t.entity(entity);
        if (data) t.data(data);
        if (action) t.action(action);
        if (actions) t.actions(actions);
        if (context) t.context(context);
        if (globals) t.globals(globals);
        if (link) t.link(link);

        const attributes = t.get();

        const attrString = Object.entries(attributes)
          .map(([k, v]) => (v ? `${k}="${v}"` : k))
          .join('\n  ');
        const html = `<div\n  ${attrString}\n>\n  <!-- content -->\n</div>`;

        return mcpResult({ attributes, html });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
