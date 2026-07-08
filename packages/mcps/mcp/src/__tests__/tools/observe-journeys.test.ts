jest.mock('@walkeros/core', () => ({
  mcpResult: jest.fn((result, hints) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          hints ? { ...result, _hints: hints } : result,
          null,
          2,
        ),
      },
    ],
    structuredContent: hints ? { ...result, _hints: hints } : result,
  })),
  mcpError: jest.fn((error, hint) => {
    const err = error as Error & { code?: string };
    const structured: Record<string, unknown> = {
      error: err?.message ?? 'Unknown error',
    };
    if (hint) structured.hint = hint;
    if (err?.code) structured.code = err.code;
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError: true,
    };
  }),
}));

import { registerObserveJourneysTool } from '../../tools/observe-journeys.js';
import { stubClient } from '../support/stub-client.js';
import type { JourneysResult } from '../../tool-client.js';

type HandlerFn = (input: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: HandlerFn }> = {};
  return {
    registerTool(name: string, config: unknown, handler: HandlerFn) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

/**
 * A one-journey result whose single hop carries BOTH correlation handles
 * (traceId/stepId/eventId/mappingKey — must stay literal, they are filter input)
 * and captured event payloads (entry.name/in/out/error/meta — must be wrapped).
 */
function journeysResult(sessionId: string | null): JourneysResult {
  return {
    sessionId,
    flowId: 'flow_1',
    assembledAt: '2026-07-06T00:00:00.000Z',
    journeys:
      sessionId === null
        ? []
        : [
            {
              id: 'T1',
              correlation: 'trace',
              traceId: 'T1',
              entry: {
                eventId: 'E1',
                name: 'page view',
                timestamp: '2026-07-06T00:00:00.000Z',
              },
              hops: [
                {
                  stepId: 'destination.gtag',
                  stepType: 'destination',
                  eventId: 'E1',
                  status: 'error',
                  terminalPhase: 'error',
                  startedAtMs: 0,
                  timestamp: '2026-07-06T00:00:00.000Z',
                  mappingKey: 'page view',
                  in: { email: 'user@example.com' },
                  out: { endpoint: 'https://vendor.example/collect' },
                  error: { name: 'FetchError', message: 'vendor 500' },
                  meta: { note: 'captured note' },
                  calls: [
                    {
                      fn: 'window.gtag',
                      args: ['event', 'purchase', { email: 'x@y.z' }],
                      ts: 1,
                    },
                  ],
                  branches: [
                    {
                      branchId: 'B1',
                      status: 'error',
                      terminalPhase: 'error',
                      out: { url: 'https://branch.example/x' },
                      error: { message: 'branch boom' },
                      calls: [
                        {
                          fn: 'window.fbq',
                          args: ['track', { user: 'z@z.z' }],
                          ts: 2,
                        },
                      ],
                    },
                  ],
                },
              ],
              platforms: ['web'],
              status: 'partial',
              lossy: false,
              firstTimestamp: 1,
              lastTimestamp: 2,
              totalMs: 1,
            },
          ],
    gaps: [],
  };
}

describe('observe_journeys tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
  });

  it('registers with name "observe_journeys" and read-only annotations', () => {
    registerObserveJourneysTool(server as never, stubClient());
    const tool = server.getTool('observe_journeys');
    expect(tool).toBeDefined();
    const config = tool!.config as { annotations: Record<string, boolean> };
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it('describes the flowId-resolved, no-active-session behavior', () => {
    registerObserveJourneysTool(server as never, stubClient());
    const tool = server.getTool('observe_journeys')!;
    const description = (
      tool.config as { description: string }
    ).description.toLowerCase();
    expect(description).toContain('flowid');
    expect(description).toContain('journey');
    expect(description).toContain('session');
    expect(description).toContain('traceid');
    expect(description).toContain('limit');
  });

  it('requires flowId', async () => {
    registerObserveJourneysTool(server as never, stubClient());
    const tool = server.getTool('observe_journeys')!;
    const result = (await tool.handler({})) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('flowId is required');
  });

  it('passes flowId/projectId/traceId/limit through to listJourneys', async () => {
    const listJourneys = jest.fn().mockResolvedValue(journeysResult('ses_1'));
    registerObserveJourneysTool(server as never, stubClient({ listJourneys }));

    const tool = server.getTool('observe_journeys')!;
    await tool.handler({
      flowId: 'flow_1',
      projectId: 'proj_1',
      traceId: 'T1',
      limit: 10,
    });

    expect(listJourneys).toHaveBeenCalledWith({
      flowId: 'flow_1',
      projectId: 'proj_1',
      traceId: 'T1',
      limit: 10,
    });
  });

  it('omits absent optional params from the client call', async () => {
    const listJourneys = jest.fn().mockResolvedValue(journeysResult('ses_1'));
    registerObserveJourneysTool(server as never, stubClient({ listJourneys }));

    const tool = server.getTool('observe_journeys')!;
    await tool.handler({ flowId: 'flow_1' });

    expect(listJourneys).toHaveBeenCalledWith({ flowId: 'flow_1' });
  });

  it('keeps correlation handles literal (usable as filter input) while wrapping captured payloads', async () => {
    const listJourneys = jest.fn().mockResolvedValue(journeysResult('ses_1'));
    registerObserveJourneysTool(server as never, stubClient({ listJourneys }));

    const tool = server.getTool('observe_journeys')!;
    const result = (await tool.handler({ flowId: 'flow_1' })) as {
      structuredContent: {
        sessionId: string;
        journeys: Array<{
          id: string;
          traceId: string;
          correlation: string;
          entry: { eventId: string; name: string };
          hops: Array<{
            stepId: string;
            eventId: string;
            status: string;
            mappingKey: string;
            in: { email: string };
            out: { endpoint: string };
            error: { message: string };
            meta: { note: string };
            calls: Array<{ args: [string, string, { email: string }] }>;
            branches: Array<{
              branchId: string;
              status: string;
              terminalPhase: string;
              out: { url: string };
              error: { message: string };
              calls: Array<{ args: [string, { user: string }] }>;
            }>;
          }>;
        }>;
      };
    };

    expect(result.structuredContent.sessionId).toBe('ses_1');
    const journey = result.structuredContent.journeys[0];
    const hop = journey.hops[0];

    // Correlation handles stay LITERAL so the agent can re-query by traceId and
    // reference the step / mapping rule verbatim.
    expect(journey.id).toBe('T1');
    expect(journey.traceId).toBe('T1');
    expect(journey.correlation).toBe('trace');
    expect(journey.entry.eventId).toBe('E1');
    expect(hop.stepId).toBe('destination.gtag');
    expect(hop.eventId).toBe('E1');
    expect(hop.status).toBe('error');
    expect(hop.mappingKey).toBe('page view');

    // Captured, event-controlled payloads are WRAPPED for third-party LLM context.
    expect(journey.entry.name).toBe('<user_data>page view</user_data>');
    expect(hop.in.email).toBe('<user_data>user@example.com</user_data>');
    expect(hop.out.endpoint).toBe(
      '<user_data>https://vendor.example/collect</user_data>',
    );
    expect(hop.error.message).toBe('<user_data>vendor 500</user_data>');
    expect(hop.meta.note).toBe('<user_data>captured note</user_data>');

    // Vendor call args (the deepest captured sub-tree, e.g. gtag args) are
    // wrapped at every string leaf, including nested object values.
    const callArgs = hop.calls[0].args;
    expect(callArgs[0]).toBe('<user_data>event</user_data>');
    expect(callArgs[1]).toBe('<user_data>purchase</user_data>');
    expect(callArgs[2].email).toBe('<user_data>x@y.z</user_data>');

    // Fan-out branch: structural fields stay literal; every captured payload
    // (out, error.message, and nested call args) is wrapped.
    const branch = hop.branches[0];
    expect(branch.branchId).toBe('B1');
    expect(branch.status).toBe('error');
    expect(branch.terminalPhase).toBe('error');
    expect(branch.out.url).toBe(
      '<user_data>https://branch.example/x</user_data>',
    );
    expect(branch.error.message).toBe('<user_data>branch boom</user_data>');
    expect(branch.calls[0].args[1].user).toBe('<user_data>z@z.z</user_data>');
  });

  it('surfaces the no-active-session result with a start-a-session hint', async () => {
    const listJourneys = jest.fn().mockResolvedValue(journeysResult(null));
    registerObserveJourneysTool(server as never, stubClient({ listJourneys }));

    const tool = server.getTool('observe_journeys')!;
    const result = (await tool.handler({ flowId: 'flow_1' })) as {
      structuredContent: { sessionId: string | null; journeys: unknown[] };
      content: Array<{ text: string }>;
    };

    expect(result.structuredContent.sessionId).toBeNull();
    expect(result.structuredContent.journeys).toEqual([]);
    expect(result.content[0].text.toLowerCase()).toContain('no active observe');
  });

  it('catches errors and returns mcpError with an auth hint on auth failure', async () => {
    const listJourneys = jest.fn().mockRejectedValue(new Error('Unauthorized'));
    registerObserveJourneysTool(server as never, stubClient({ listJourneys }));

    const tool = server.getTool('observe_journeys')!;
    const result = (await tool.handler({ flowId: 'flow_1' })) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Unauthorized');
    expect(parsed.hint).toContain('logged in');
  });
});
