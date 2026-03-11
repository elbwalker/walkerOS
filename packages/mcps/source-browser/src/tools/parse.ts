import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { getAllEvents, getGlobals } from '@walkeros/web-source-browser';
import { withDom } from '../lib/dom.js';
import { ParseTaggingOutputShape } from '../schemas/output.js';

export function registerParseTool(server: McpServer) {
  server.registerTool(
    'parse_tagging',
    {
      title: 'Parse Tagging',
      description:
        'Parse HTML with data-elb attributes using real DOM parsing (JSDOM). ' +
        'Extracts all walkerOS events and globals. Use validate_tagging for issue detection.',
      inputSchema: {
        html: z.string().describe('HTML snippet with data-elb attributes'),
        prefix: z
          .string()
          .optional()
          .describe('Custom prefix (default: data-elb)'),
      },
      outputSchema: ParseTaggingOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ html, prefix: customPrefix }) => {
      try {
        if (!html || !html.trim()) {
          return mcpError(new Error('html is required'));
        }

        const prefix = customPrefix || 'data-elb';

        return withDom(html, (dom) => {
          const doc = dom.window.document;
          const body = doc.body;

          // Extract events using walker parser
          const events = getAllEvents(body, prefix);

          // Extract globals
          const globals = getGlobals(prefix, doc);

          const summary = `Found ${events.length} event(s), ${Object.keys(globals).length} global(s)`;

          return mcpResult({ events, globals, summary });
        });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
