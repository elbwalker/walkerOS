import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { withDom } from '../lib/dom.js';
import { ValidateTaggingOutputShape } from '../schemas/output.js';

const KNOWN_TRIGGERS = [
  'load',
  'click',
  'impression',
  'visible',
  'hover',
  'submit',
  'wait',
  'pulse',
];

type Issue = { check: string; message: string; element: string };

export function registerValidateTool(server: McpServer) {
  server.registerTool(
    'validate_tagging',
    {
      title: 'Validate Tagging',
      description:
        'Validate HTML data-elb tagging for common mistakes. ' +
        'Checks for orphan actions, missing entities, unknown triggers, and more.',
      inputSchema: {
        html: z.string().describe('HTML snippet to validate'),
        prefix: z
          .string()
          .optional()
          .describe('Custom prefix (default: data-elb)'),
      },
      outputSchema: ValidateTaggingOutputShape,
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
          const body = dom.window.document.body;
          const errors: Issue[] = [];
          const warnings: Issue[] = [];
          const info: Issue[] = [];
          const snip = (el: Element) => el.outerHTML.slice(0, 120);
          const actionAttr = `${prefix}action`;
          const actionsAttr = `${prefix}actions`;

          // 1. Empty entity names
          body.querySelectorAll(`[${prefix}]`).forEach((el) => {
            if (!el.getAttribute(prefix)?.trim()) {
              errors.push({
                check: 'empty_entity',
                message: 'Empty entity name',
                element: snip(el),
              });
            }
          });

          // 2. Orphan actions
          body
            .querySelectorAll(`[${actionAttr}], [${actionsAttr}]`)
            .forEach((el) => {
              let parent = el.parentElement;
              let hasEntity = el.hasAttribute(prefix);
              while (parent && parent !== body && !hasEntity) {
                if (parent.hasAttribute(prefix)) hasEntity = true;
                parent = parent.parentElement;
              }
              if (!hasEntity) {
                warnings.push({
                  check: 'orphan_action',
                  message:
                    'Action without entity ancestor (will fire as "page" entity)',
                  element: snip(el),
                });
              }
            });

          // 3. Entities without actions
          body.querySelectorAll(`[${prefix}]`).forEach((el) => {
            const hasAction =
              el.querySelector(`[${actionAttr}], [${actionsAttr}]`) ||
              el.hasAttribute(actionAttr) ||
              el.hasAttribute(actionsAttr);
            if (!hasAction) {
              const name = el.getAttribute(prefix);
              info.push({
                check: 'entity_without_action',
                message: `Entity "${name}" has no action — won't produce events without a trigger`,
                element: snip(el),
              });
            }
          });

          // 4. Orphan properties
          body.querySelectorAll('*').forEach((el) => {
            Array.from(el.attributes).forEach((attr) => {
              const match = attr.name.match(new RegExp(`^${prefix}-(.+)$`));
              if (!match) return;
              const entityName = match[1];
              if (!entityName) return;

              // Walk up to find matching data-elb="entityName"
              let parent: Element | null = el;
              let found = false;
              while (parent && parent !== body) {
                if (parent.getAttribute(prefix) === entityName) {
                  found = true;
                  break;
                }
                parent = parent.parentElement;
              }
              if (!found) {
                warnings.push({
                  check: 'orphan_property',
                  message: `Property "${attr.name}" without matching entity data-elb="${entityName}" ancestor (may be intentional if using tagger scope)`,
                  element: snip(el),
                });
              }
            });
          });

          // 5. Unknown triggers
          body
            .querySelectorAll(`[${actionAttr}], [${actionsAttr}]`)
            .forEach((el) => {
              const val =
                el.getAttribute(actionAttr) ||
                el.getAttribute(actionsAttr) ||
                '';
              val.split(';').forEach((pair) => {
                const trigger = pair
                  .split(':')[0]
                  ?.trim()
                  .replace(/\(.*\)$/, '');
                if (trigger && !KNOWN_TRIGGERS.includes(trigger)) {
                  warnings.push({
                    check: 'unknown_trigger',
                    message: `Unknown trigger "${trigger}" (known: ${KNOWN_TRIGGERS.join(', ')})`,
                    element: snip(el),
                  });
                }
              });
            });

          const valid = errors.length === 0;
          const total = errors.length + warnings.length + info.length;
          const summary = valid
            ? total === 0
              ? 'Valid — no issues found'
              : `Valid — ${warnings.length} warning(s), ${info.length} info(s)`
            : `Invalid — ${errors.length} error(s), ${warnings.length} warning(s), ${info.length} info(s)`;

          return mcpResult({ valid, errors, warnings, info, summary });
        });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
}
