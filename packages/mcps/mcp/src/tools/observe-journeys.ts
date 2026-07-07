import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import type { Journey, JourneyHop, JourneyBranch } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';
import { redactNestedStrings } from '../user-data.js';

import type { ToolClient } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';

const TITLE = 'Observe Journeys';
const DESCRIPTION =
  'Read the assembled, cross-runtime journeys for a flow that is currently being observed (an active Observe session). ' +
  'Pass flowId; the active session is resolved for you (a flow has at most one). ' +
  'Each journey is one traced event reconstructed end to end across web and server: its ordered hops (source, transformer, collector, destination), each hop status (pending/done/skipped/error), captured in/out payloads, consent, and vendor calls. ' +
  'Use this to see what actually happened to live events: which destinations fired, what mapping ran, where an event was skipped or errored, and whether records were lost (gaps + a journey `lossy` flag). ' +
  'When the flow has no active session the result is `{ sessionId: null, journeys: [], gaps: [] }` — start an Observe session in the app and drive traffic first, then read again. ' +
  'Narrow with traceId (one trace) and limit (page cap, most recent kept; default 50). ' +
  'Read-only.';

const inputSchema = {
  flowId: z
    .string()
    .describe('Flow to read journeys for (its active Observe session).'),
  projectId: z
    .string()
    .optional()
    .describe('Project ID. Optional; falls back to the default project.'),
  traceId: z
    .string()
    .optional()
    .describe('Return only the journeys for this trace id.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Max journeys to return (1-100, most recent kept). Defaults to 50.',
    ),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/**
 * Neutralise ONLY the captured, event-controlled payload fields of a journey for
 * third-party LLM context, deep-wrapping every string inside them in
 * <user_data>. Everything else stays literal.
 *
 * The distinction is load-bearing, not cosmetic: `observe_journeys` takes
 * `traceId` as a filter input, so the trigger -> read -> filter-by-traceId loop
 * only works if `traceId` (and the other correlation handles the agent
 * references) comes back verbatim. Wrapping them would break re-querying.
 *
 * KEEP LITERAL (assembler/wire-generated correlation handles, enums, numbers, or
 * the user's own config vocabulary):
 *   id, correlation, traceId, entry.eventId/sourceId/timestamp, hop.stepId,
 *   stepType, eventId, parentEventId, status, terminalPhase, skipReason,
 *   mappingKey, contractRule, consent/consentApplied (config category -> bool),
 *   platform(s), branchId, batched/flushConfirmed, and every timestamp/duration/
 *   seq/gap-bound number.
 *
 * WRAP (data captured off the live event stream, attacker-influenceable):
 *   entry.name (inbound event name), hop.in, hop.out, hop.error, hop.calls,
 *   hop.meta, and the same out/error/calls on each fan-out branch.
 *
 * A structure-aware transform rather than a key-skip over `redactNestedStrings`,
 * because a flat key skip is depth-agnostic: it would either wrap the correlation
 * handles (breaking the query loop) or, if it skipped keys like `stepId`
 * globally, leave a captured payload field that happens to be named `stepId`
 * unwrapped. Wrapping whole payload sub-trees keeps every correlation handle
 * literal AND wraps every captured string, whatever its key.
 */
function redactJourneyPayloads(journeys: Journey[]): Journey[] {
  return journeys.map((journey) => ({
    ...journey,
    entry: {
      ...journey.entry,
      ...(journey.entry.name !== undefined && {
        name: redactNestedStrings(journey.entry.name),
      }),
    },
    hops: journey.hops.map(redactHopPayloads),
  }));
}

function redactHopPayloads(hop: JourneyHop): JourneyHop {
  return {
    ...hop,
    ...(hop.in !== undefined && { in: redactNestedStrings(hop.in) }),
    ...(hop.out !== undefined && { out: redactNestedStrings(hop.out) }),
    ...(hop.error !== undefined && { error: redactNestedStrings(hop.error) }),
    ...(hop.calls !== undefined && { calls: redactNestedStrings(hop.calls) }),
    ...(hop.meta !== undefined && { meta: redactNestedStrings(hop.meta) }),
    ...(hop.branches !== undefined && {
      branches: hop.branches.map(redactBranchPayloads),
    }),
  };
}

function redactBranchPayloads(branch: JourneyBranch): JourneyBranch {
  return {
    ...branch,
    ...(branch.out !== undefined && { out: redactNestedStrings(branch.out) }),
    ...(branch.error !== undefined && {
      error: redactNestedStrings(branch.error),
    }),
    ...(branch.calls !== undefined && {
      calls: redactNestedStrings(branch.calls),
    }),
  };
}

export function createObserveJourneysToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'observe_journeys',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => observeJourneysHandlerBody(client, input),
  };
}

async function observeJourneysHandlerBody(client: ToolClient, input: unknown) {
  const { flowId, projectId, traceId, limit } = (input ?? {}) as {
    flowId?: string;
    projectId?: string;
    traceId?: string;
    limit?: number;
  };
  if (!flowId) {
    return mcpError(new Error('flowId is required for observe_journeys.'));
  }
  try {
    const result = await client.listJourneys({
      flowId,
      ...(projectId !== undefined && { projectId }),
      ...(traceId !== undefined && { traceId }),
      ...(limit !== undefined && { limit }),
    });
    // Wrap only the captured, event-controlled payload sub-trees (in/out/error/
    // calls/meta + entry.name) in <user_data> for third-party LLM context, while
    // keeping every correlation handle (traceId/stepId/eventId/mappingKey) and
    // enum/number literal so the agent can feed them straight back as filter
    // input. gaps are numeric + platform enum only, so they pass through.
    const safe = {
      sessionId: result.sessionId,
      flowId: result.flowId,
      assembledAt: result.assembledAt,
      journeys: redactJourneyPayloads(result.journeys),
      gaps: result.gaps,
    };
    return mcpResult(safe, {
      next:
        result.sessionId === null
          ? [
              'No active Observe session for this flow. Start one in the app and drive traffic, then read again.',
            ]
          : [
              'Inspect a single trace with traceId, or adjust the flow config and re-read to confirm the change.',
            ],
    });
  } catch (error) {
    return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
  }
}

export function registerObserveJourneysTool(
  server: McpServer,
  client: ToolClient,
) {
  const spec = createObserveJourneysToolSpec(client);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
