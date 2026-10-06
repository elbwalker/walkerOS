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
  mcpError: jest.fn((error: unknown, hint?: unknown) => {
    const err: object =
      typeof error === 'object' && error !== null ? error : {};
    const structured: Record<string, unknown> = {
      error: ('message' in err ? err.message : undefined) ?? 'Unknown error',
    };
    if (hint) structured.hint = hint;
    if ('code' in err && err.code) structured.code = err.code;
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError: true,
    };
  }),
}));

import { createObserveJourneysToolSpec } from '../../tools/observe-journeys.js';
import { CodedError } from '../support/coded-error.js';
import { stubClient } from '../support/stub-client.js';
import type { JourneysResult } from '../../tool-client.js';
import {
  structured,
  record,
  rows,
  isErrorResult,
  textOf,
} from '../support/tool-result.js';

function parse(text: string): unknown {
  return JSON.parse(text);
}

/** An array of any values, narrowed. */
function list(value: unknown): unknown[] {
  if (!Array.isArray(value))
    throw new Error(`Not an array: ${JSON.stringify(value)}`);
  return value;
}

/**
 * A one-journey result whose single hop carries BOTH correlation handles
 * (traceId/stepId/eventId/mappingKey — must stay literal, they are filter input)
 * and captured event payloads (entry.name/in/out/error/meta — must be wrapped).
 */
function journeysResult(
  sessionId: string | null,
  unattributed?: JourneysResult['unattributed'],
): JourneysResult {
  return {
    sessionId,
    flowId: 'flow_1',
    assembledAt: '2026-07-06T00:00:00.000Z',
    ...(unattributed !== undefined && { unattributed }),
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with name "observe_journeys" and read-only annotations', () => {
    const tool = createObserveJourneysToolSpec(stubClient());
    expect(tool.name).toBe('observe_journeys');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it('describes the flowId-resolved, no-active-session behavior', () => {
    const tool = createObserveJourneysToolSpec(stubClient());
    const description = tool.description.toLowerCase();
    expect(description).toContain('flowid');
    expect(description).toContain('journey');
    expect(description).toContain('session');
    expect(description).toContain('traceid');
    expect(description).toContain('limit');
  });

  it('requires flowId', async () => {
    const tool = createObserveJourneysToolSpec(stubClient());
    const result = await tool.handler({});
    expect(isErrorResult(result)).toBe(true);
    const parsed = record(parse(textOf(result)));
    expect(parsed.error).toBe(
      'flowId: Invalid input: expected string, received undefined',
    );
  });

  it('passes flowId/projectId/traceId/limit through to listJourneys', async () => {
    const listJourneys = jest.fn().mockResolvedValue(journeysResult('ses_1'));
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
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
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
    await tool.handler({ flowId: 'flow_1' });

    expect(listJourneys).toHaveBeenCalledWith({ flowId: 'flow_1' });
  });

  it('keeps correlation handles literal (usable as filter input) while wrapping captured payloads', async () => {
    const listJourneys = jest.fn().mockResolvedValue(journeysResult('ses_1'));
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
    const result = await tool.handler({ flowId: 'flow_1' });

    expect(structured(result).sessionId).toBe('ses_1');
    const journey = rows(structured(result).journeys)[0];
    const hop = rows(journey.hops)[0];

    // Correlation handles stay LITERAL so the agent can re-query by traceId and
    // reference the step / mapping rule verbatim.
    expect(journey.id).toBe('T1');
    expect(journey.traceId).toBe('T1');
    expect(journey.correlation).toBe('trace');
    expect(record(journey.entry).eventId).toBe('E1');
    expect(hop.stepId).toBe('destination.gtag');
    expect(hop.eventId).toBe('E1');
    expect(hop.status).toBe('error');
    expect(hop.mappingKey).toBe('page view');

    // Captured, event-controlled payloads are WRAPPED for third-party LLM context.
    expect(record(journey.entry).name).toBe('<user_data>page view</user_data>');
    expect(record(hop.in).email).toBe(
      '<user_data>user@example.com</user_data>',
    );
    expect(record(hop.out).endpoint).toBe(
      '<user_data>https://vendor.example/collect</user_data>',
    );
    expect(record(hop.error).message).toBe('<user_data>vendor 500</user_data>');
    expect(record(hop.meta).note).toBe('<user_data>captured note</user_data>');

    // Vendor call args (the deepest captured sub-tree, e.g. gtag args) are
    // wrapped at every string leaf, including nested object values.
    const callArgs = list(rows(hop.calls)[0].args);
    expect(callArgs[0]).toBe('<user_data>event</user_data>');
    expect(callArgs[1]).toBe('<user_data>purchase</user_data>');
    expect(record(callArgs[2]).email).toBe('<user_data>x@y.z</user_data>');

    // Fan-out branch: structural fields stay literal; every captured payload
    // (out, error.message, and nested call args) is wrapped.
    const branch = rows(hop.branches)[0];
    expect(branch.branchId).toBe('B1');
    expect(branch.status).toBe('error');
    expect(branch.terminalPhase).toBe('error');
    expect(record(branch.out).url).toBe(
      '<user_data>https://branch.example/x</user_data>',
    );
    expect(record(branch.error).message).toBe(
      '<user_data>branch boom</user_data>',
    );
    expect(record(list(rows(branch.calls)[0].args)[1]).user).toBe(
      '<user_data>z@z.z</user_data>',
    );
  });

  it('passes unattributed through, literal, so the agent sees the loss the REST surface reports', async () => {
    // The handler builds an explicit allowlist, so a field the client returns is
    // dropped unless it is named. Dropping this one would make the agent surface
    // under-report loss while REST reports it: silence, not a smaller number.
    // Nothing in it is event-controlled (platform enum, numbers, and stepIds
    // from the user's own config), so no <user_data> wrapping applies.
    const listJourneys = jest.fn().mockResolvedValue(
      journeysResult('ses_1', [
        {
          platform: 'web',
          count: 3,
          fromMs: 10,
          toMs: 20,
          stepIds: ['destination.gtag', 'source.browser'],
        },
      ]),
    );
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
    const result = await tool.handler({ flowId: 'flow_1' });

    expect(structured(result).unattributed).toEqual([
      {
        platform: 'web',
        count: 3,
        fromMs: 10,
        toMs: 20,
        stepIds: ['destination.gtag', 'source.browser'],
      },
    ]);
  });

  it('leaves unattributed absent when the client reports none', async () => {
    // Absent means "no loss to report", which reads differently from an empty
    // array; the app envelope spreads it conditionally for the same reason.
    const listJourneys = jest.fn().mockResolvedValue(journeysResult('ses_1'));
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
    const result = await tool.handler({ flowId: 'flow_1' });

    expect('unattributed' in structured(result)).toBe(false);
  });

  it('surfaces the no-active-session result with a start-a-session hint', async () => {
    const listJourneys = jest.fn().mockResolvedValue(journeysResult(null));
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
    const result = await tool.handler({ flowId: 'flow_1' });

    expect(structured(result).sessionId).toBeNull();
    expect(structured(result).journeys).toEqual([]);
    expect(textOf(result).toLowerCase()).toContain('no active observe');
  });

  it('catches errors and returns mcpError with an auth hint on auth failure', async () => {
    const listJourneys = jest
      .fn()
      .mockRejectedValue(new CodedError('Unauthorized', 'UNAUTHORIZED', 401));
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
    const result = await tool.handler({ flowId: 'flow_1' });

    expect(isErrorResult(result)).toBe(true);
    const parsed = record(parse(textOf(result)));
    expect(parsed.error).toBe('Unauthorized');
    expect(parsed.hint).toContain('logged in');
  });

  it('adds no auth hint when the caller lacks the role', async () => {
    const listJourneys = jest
      .fn()
      .mockRejectedValue(
        new CodedError('Requires member role or higher', 'FORBIDDEN', 403),
      );
    const tool = createObserveJourneysToolSpec(stubClient({ listJourneys }));
    const result = await tool.handler({ flowId: 'flow_1' });

    expect(isErrorResult(result)).toBe(true);
    const parsed = record(parse(textOf(result)));
    expect(parsed.error).toBe('Requires member role or higher');
    expect(parsed).not.toHaveProperty('hint');
  });
});
