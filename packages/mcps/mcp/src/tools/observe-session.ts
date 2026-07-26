import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { isAuthError, AUTH_HINT } from '../types.js';

import type {
  ToolClient,
  ObserveSessionResult,
  ObserveLevel,
} from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';

const TITLE = 'Observe Session';
/**
 * Exported so the hosted plane can assert parity against this exact string
 * instead of retyping it.
 */
export const DESCRIPTION =
  'Open, inspect, or end an Observe session: a time-boxed window on one flow that runtimes attach to as arms. ' +
  'A preview arm streams from a browser, a container arm runs server-side, and both feed ONE shared journeys feed. ' +
  'start opens the window (arms picks which runtimes attach), status reports per-arm state plus recordsReceived and expiresAt, stop ends the whole session including every arm. ' +
  'A flow has at most one session, so status/stop resolve it from flowId when sessionId is omitted. ' +
  'Read the events with observe_journeys; this tool never returns event data and never judges whether events are correct.';

/**
 * Hints carry the verb ladder rather than the description. Module constants so
 * the wording is one string per idea, quotable verbatim, and identical across
 * planes. Exported so the hosted plane imports them instead of retyping them,
 * which makes cross-plane parity a compiler concern.
 */
export const HINT_SIMULATE_FIRST =
  'Simulate before preview: flow_simulate checks mapping with no browser.';
export const HINT_PREVIEW_STREAMS =
  'Preview streams into this session: mint a link with flow_manage preview_regrant, then open it on your site.';
export const HINT_READ =
  'Read with observe_journeys (flowId); it is the only read.';
export const HINT_STOP = 'End both arms with observe_session stop.';
export const HINT_EMPTY_FEED =
  'recordsReceived is 0: nothing has reached the feed yet. Drive traffic on an attached arm.';
export const HINT_ENDED =
  'Session ended and both arms detached. Start a new one with observe_session start.';
export const HINT_NO_WINDOW =
  'No Observe session on this flow. Open one with observe_session start.';

const inputSchema = {
  action: z
    .enum(['start', 'status', 'stop'])
    .describe(
      'start opens a session, status reports arm state, stop ends the whole session.',
    ),
  flowId: z.string().describe('Flow the Observe session runs on.'),
  projectId: z
    .string()
    .optional()
    .describe('Project ID. Optional; falls back to the default project.'),
  sessionId: z
    .string()
    .optional()
    .describe(
      'Session to act on for status/stop. Optional; the flow has at most one session and it is resolved for you.',
    ),
  arms: z
    .object({
      container: z
        .literal(true)
        .optional()
        .describe(
          "Pass true to attach the server container arm, which selects the flow's server settings when no preview arm is named. Only true is accepted: a web settings that references a server flow always brings its container arm along, so a container cannot be suppressed here.",
        ),
      preview: z
        .string()
        .optional()
        .describe(
          "Name the flow settings this session observes. A web settings attaches the browser preview arm (plus the container arm of any server flow it references); a server settings attaches the container arm alone. Omit to use the flow's single web settings.",
        ),
    })
    .optional()
    .describe(
      'Which runtimes attach. Omit to attach the default preview arm; a web settings that references a server flow brings its container arm with it.',
    ),
  origins: z
    .array(z.string())
    .optional()
    .describe(
      'Bare https origins (https://host[:port]) the session may ingest web events from.',
    ),
  level: z
    .enum(['off', 'standard', 'trace'])
    .optional()
    .describe("Container observation verbosity. Defaults to the app's own."),
  replace: z
    .boolean()
    .optional()
    .describe(
      "Replace the flow's existing window instead of attaching to it. Re-provisions from the new config.",
    ),
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

interface ArmsInput {
  container?: true;
  preview?: string;
}

interface SettingsEntry {
  name: string;
  platform: 'web' | 'server';
}

/**
 * Read the settings summaries off a flow response. `getFlow` is typed
 * `Promise<unknown>` on the client, so narrow structurally instead of casting:
 * anything that is not a well-formed settings entry is simply not a candidate.
 */
function readSettings(flow: unknown): SettingsEntry[] {
  if (!flow || typeof flow !== 'object') return [];
  const settings = (flow as { settings?: unknown }).settings;
  if (!Array.isArray(settings)) return [];
  const entries: SettingsEntry[] = [];
  for (const entry of settings) {
    if (!entry || typeof entry !== 'object') continue;
    const { name, platform } = entry as { name?: unknown; platform?: unknown };
    if (typeof name !== 'string') continue;
    if (platform !== 'web' && platform !== 'server') continue;
    entries.push({ name, platform });
  }
  return entries;
}

/**
 * Translate the arms shape onto the one field the session contract takes.
 *
 * The app derives a session's arms from the flow topology under a single
 * `settingsName`: a web settings that references a server flow provisions both
 * arms, a server settings provisions the container alone. So arms selects a
 * NAME here rather than toggling arms on the wire.
 */
function resolveSettingsName(
  settings: SettingsEntry[],
  arms: ArmsInput | undefined,
): string {
  if (arms?.preview !== undefined) {
    const named = settings.find((entry) => entry.name === arms.preview);
    if (!named) {
      throw new Error(
        `This flow has no settings named "${arms.preview}". Available: ${describeSettings(settings)}`,
      );
    }
    return named.name;
  }

  if (arms?.container === true) {
    const servers = settings.filter((entry) => entry.platform === 'server');
    const only = servers[0];
    if (!only) {
      throw new Error(
        `The container arm needs a server settings, and this flow has no server settings. Available: ${describeSettings(settings)}`,
      );
    }
    if (servers.length > 1) {
      throw new Error(
        `This flow has several server settings. Name one with arms.preview. Available: ${describeSettings(settings)}`,
      );
    }
    return only.name;
  }

  const webs = settings.filter((entry) => entry.platform === 'web');
  const onlyWeb = webs[0];
  if (onlyWeb && webs.length === 1) return onlyWeb.name;
  if (webs.length > 1) {
    throw new Error(
      `This flow has several web settings. Name one with arms.preview. Available: ${describeSettings(settings)}`,
    );
  }

  const onlySettings = settings[0];
  if (onlySettings && settings.length === 1) return onlySettings.name;
  throw new Error(
    `Could not pick a settings to observe. Name one with arms.preview. Available: ${describeSettings(settings)}`,
  );
}

function describeSettings(settings: SettingsEntry[]): string {
  if (settings.length === 0) return 'none';
  return settings
    .map((entry) => `${entry.name} (${entry.platform})`)
    .join(', ');
}

/**
 * Per-arm state derived from the response shape: a part being non-null is what
 * makes its arm attached. Connect secrets (the web credential, the container
 * env trio) stay out by construction.
 */
function toArms(session: ObserveSessionResult) {
  return {
    preview: {
      attached: session.web !== null,
      settingsName: session.observedFlowName,
      activationUrl: session.web?.activationUrl ?? null,
      previewEnabled: session.web?.previewEnabled ?? false,
    },
    container: {
      attached: session.server !== null,
      settingsName: session.serverFlowName,
      endpoint: session.server?.endpoint ?? null,
    },
  };
}

function toSummary(session: ObserveSessionResult) {
  return {
    sessionId: session.id,
    flowId: session.flowId,
    status: session.status,
    errorMessage: session.errorMessage,
    expiresAt: session.expiresAt,
    recordsReceived: session.recordsReceived,
    arms: toArms(session),
  };
}

export const SESSION_RESOLUTION_FAILED =
  "Could not resolve this flow's Observe session because the journeys read that identifies it is unavailable. Pass sessionId explicitly to act on the session without that lookup.";

/**
 * Wraps a failed lookup while preserving the structured fields `mcpError`
 * renders, so the caller keeps the machine-readable code alongside the
 * recovery instruction. The original failure rides along as `cause`.
 */
class SessionResolutionError extends Error {
  readonly code: string | undefined;
  readonly details: unknown[] | undefined;

  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = 'SessionResolutionError';
    this.code = readStringField(cause, 'code');
    this.details = readArrayField(cause, 'details');
  }
}

function readStringField(source: unknown, key: string): string | undefined {
  if (source === null || typeof source !== 'object' || !(key in source))
    return undefined;
  const value = Reflect.get(source, key);
  return typeof value === 'string' ? value : undefined;
}

function readArrayField(source: unknown, key: string): unknown[] | undefined {
  if (source === null || typeof source !== 'object' || !(key in source))
    return undefined;
  const value = Reflect.get(source, key);
  return Array.isArray(value) ? value : undefined;
}

/**
 * Resolve the flow's live window. `listJourneys` is the flow-keyed read the app
 * already exposes and its `sessionId` IS the flow's single active session, so
 * it doubles as the resolver: no second lookup contract is needed.
 *
 * That read depends on the observer, which status and stop themselves do not.
 * A failing lookup therefore reports the fallback rather than reading as "this
 * flow has no session", so stop stays reachable when the observer is down.
 */
async function resolveSessionId(
  client: ToolClient,
  options: { flowId: string; projectId?: string },
): Promise<string | null> {
  try {
    const result = await client.listJourneys({
      flowId: options.flowId,
      ...(options.projectId !== undefined && { projectId: options.projectId }),
      limit: 1,
    });
    return result.sessionId;
  } catch (error) {
    // An auth failure is about the caller, not the lookup: let it through
    // unwrapped so the handler still attaches AUTH_HINT.
    if (isAuthError(error)) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    // Carry the structured fields across: `mcpError` reads `code` and
    // `details` off the thrown error, so a bare `new Error` would strip the
    // machine-readable code and leave callers only the prose.
    throw new SessionResolutionError(
      `${SESSION_RESOLUTION_FAILED} (${detail})`,
      error,
    );
  }
}

function resolveProjectId(
  client: ToolClient,
  projectId: string | undefined,
): string | null {
  return projectId ?? client.getDefaultProject();
}

const NO_DEFAULT_PROJECT_ERROR =
  'No project ID given and no default project set. Pass projectId or set one with project_manage set_default.';

export function createObserveSessionToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'observe_session',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => observeSessionHandlerBody(client, input),
  };
}

async function observeSessionHandlerBody(client: ToolClient, input: unknown) {
  const {
    action,
    flowId,
    projectId,
    sessionId,
    arms,
    origins,
    level,
    replace,
  } = (input ?? {}) as {
    action?: 'start' | 'status' | 'stop';
    flowId?: string;
    projectId?: string;
    sessionId?: string;
    arms?: ArmsInput;
    origins?: string[];
    level?: ObserveLevel;
    replace?: boolean;
  };

  if (!flowId) {
    return mcpError(new Error('flowId is required for observe_session.'));
  }
  const resolvedProjectId = resolveProjectId(client, projectId);
  if (!resolvedProjectId) {
    return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));
  }

  try {
    switch (action) {
      case 'start': {
        if (!client.startObserveSession) {
          return mcpError(
            new Error('observe_session start is not supported by this client.'),
          );
        }
        const settings = readSettings(
          await client.getFlow({
            flowId,
            projectId: resolvedProjectId,
            fields: ['settings'],
          }),
        );
        const settingsName = resolveSettingsName(settings, arms);
        const session = await client.startObserveSession({
          projectId: resolvedProjectId,
          flowId,
          settingsName,
          ...(origins !== undefined && { origins }),
          ...(level !== undefined && { level }),
          ...(replace !== undefined && { replace }),
        });
        return mcpResult(toSummary(session), {
          next: [HINT_SIMULATE_FIRST, HINT_PREVIEW_STREAMS, HINT_READ],
        });
      }

      case 'status': {
        if (!client.getObserveSession) {
          return mcpError(
            new Error(
              'observe_session status is not supported by this client.',
            ),
          );
        }
        const resolvedSessionId =
          sessionId ??
          (await resolveSessionId(client, {
            flowId,
            projectId: resolvedProjectId,
          }));
        if (!resolvedSessionId) {
          return mcpResult(
            { sessionId: null, flowId },
            { next: [HINT_NO_WINDOW, HINT_SIMULATE_FIRST] },
          );
        }
        const session = await client.getObserveSession({
          projectId: resolvedProjectId,
          flowId,
          sessionId: resolvedSessionId,
        });
        return mcpResult(toSummary(session), {
          next:
            session.recordsReceived === 0
              ? [HINT_EMPTY_FEED, HINT_READ, HINT_STOP]
              : [HINT_READ, HINT_STOP],
        });
      }

      case 'stop': {
        if (!client.endObserveSession) {
          return mcpError(
            new Error('observe_session stop is not supported by this client.'),
          );
        }
        const resolvedSessionId =
          sessionId ??
          (await resolveSessionId(client, {
            flowId,
            projectId: resolvedProjectId,
          }));
        if (!resolvedSessionId) {
          return mcpResult(
            { sessionId: null, flowId, ended: false },
            { next: [HINT_NO_WINDOW] },
          );
        }
        await client.endObserveSession({
          projectId: resolvedProjectId,
          flowId,
          sessionId: resolvedSessionId,
        });
        return mcpResult(
          { sessionId: resolvedSessionId, flowId, ended: true },
          { next: [HINT_ENDED] },
        );
      }

      default:
        throw new Error(
          `Unknown action: ${String(action)}. Use one of: start, status, stop`,
        );
    }
  } catch (error) {
    return mcpError(error, isAuthError(error) ? AUTH_HINT : undefined);
  }
}

export function registerObserveSessionTool(
  server: McpServer,
  client: ToolClient,
) {
  const spec = createObserveSessionToolSpec(client);
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
