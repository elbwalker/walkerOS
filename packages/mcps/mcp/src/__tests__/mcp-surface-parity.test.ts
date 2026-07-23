import { z } from 'zod';
import { TOOL_DEFINITIONS } from '../tool-definitions.js';
import {
  createObserveSessionToolSpec,
  HINT_SIMULATE_FIRST,
  HINT_PREVIEW_STREAMS,
  HINT_READ,
  HINT_STOP,
  HINT_EMPTY_FEED,
  HINT_ENDED,
  HINT_NO_WINDOW,
} from '../tools/observe-session.js';
import { stubClient } from './support/stub-client.js';
import fixture from './fixtures/mcp-surface-parity.json';
import type {
  ToolClient,
  ObserveSessionResult,
  JourneysResult,
} from '../tool-client.js';

/**
 * Surface pin for the MCP tools this package publishes.
 *
 * WHAT THIS CANNOT DO. It cannot detect one plane drifting from another,
 * because there is only one implementation to drift. The walkerOS-local plane
 * and the app's hosted plane register the SAME tool objects out of THIS
 * package: the app calls `createWalkerOSMcpServer` (or `createToolHandlers`)
 * with its own `ToolClient`, and the client is the only part that differs. A
 * green run here is therefore NOT evidence that two independent
 * implementations agree, and the identical fixture committed on the app side
 * is a second copy of one contract, not a second opinion about it.
 *
 * WHAT IT DOES DO, and why it belongs at the source. It fails an unreviewed
 * change to the published tool surface here, before publish, instead of
 * downstream in a consumer that already pinned a version. It catches a renamed,
 * added, or removed tool; an added, dropped, or renamed input field; a changed
 * type, enum member, or optionality; a changed field description; a reworded
 * hint; and a changed hint ordering.
 *
 * WHY THE HINT STRINGS ARE LITERALS IN THE FIXTURE. Asserting tool output
 * against the same constant the tool emits proves only that both sides read one
 * variable, so a reword would sail through. The fixture holds the wording; the
 * imported constants make their existence and names compiler-checked, and the
 * bridge test below is the single place the two meet.
 */

const observeSessionSpec = () => createObserveSessionToolSpec(stubClient());

const declarativeToolNames = () => TOOL_DEFINITIONS.map((d) => d.name).sort();

const HINTS: Record<string, string> = {
  SIMULATE_FIRST: HINT_SIMULATE_FIRST,
  PREVIEW_STREAMS: HINT_PREVIEW_STREAMS,
  READ: HINT_READ,
  STOP: HINT_STOP,
  EMPTY_FEED: HINT_EMPTY_FEED,
  ENDED: HINT_ENDED,
  NO_WINDOW: HINT_NO_WINDOW,
};

/** Hints the handler actually emitted, mapped back to their fixture key names. */
function emittedHintKeys(result: unknown): string[] {
  const structured = (result as { structuredContent: Record<string, unknown> })
    .structuredContent;
  const next = (structured._hints as { next?: string[] } | undefined)?.next;
  return (next ?? []).map((hint) => {
    const entry = Object.entries(HINTS).find(([, value]) => value === hint);
    if (!entry) throw new Error(`Hint is not in the fixture: ${hint}`);
    return entry[0];
  });
}

function session(
  overrides: Partial<ObserveSessionResult> = {},
): ObserveSessionResult {
  return {
    id: 'ses_1',
    projectId: 'proj_1',
    flowId: 'flow_1',
    status: 'live',
    errorMessage: null,
    observedFlowName: 'web',
    serverFlowName: 'server',
    web: {
      activationUrl: 'https://shop.example.com?elbPreview=gr_x',
      credential: 'obsw_pb1.ses_1.tok',
      previewEnabled: true,
      bundleUrl: 'https://cdn.example.com/preview/gr_x.js',
    },
    server: {
      endpoint: 'https://container.example.com',
      env: {
        WALKEROS_OBSERVER_URL: 'https://observer.example.com',
        WALKEROS_DEPLOYMENT_ID: 'dep_1',
        WALKEROS_INGEST_TOKEN: 'ing_1',
      },
    },
    expiresAt: '2026-07-18T01:00:00.000Z',
    recordsReceived: 7,
    createdAt: '2026-07-18T00:00:00.000Z',
    ...overrides,
  };
}

function journeys(sessionId: string | null): JourneysResult {
  return {
    sessionId,
    flowId: 'flow_1',
    assembledAt: '2026-07-18T00:00:00.000Z',
    journeys: [],
    gaps: [],
  };
}

async function hintKeysFor(
  overrides: Partial<ToolClient>,
  input: Record<string, unknown>,
): Promise<string[]> {
  const spec = createObserveSessionToolSpec(
    stubClient({ getDefaultProject: () => 'proj_1', ...overrides }),
  );
  return emittedHintKeys(await spec.handler(input));
}

describe('MCP surface parity', () => {
  it('pins the tool roster the package declares', () => {
    // `diagnostics` is not in TOOL_DEFINITIONS at all: it is composed at
    // handler-build time from a client and a package version, so the roster is
    // pinned in two halves: the declarative registry below, and the full
    // 17-name record asserted in create-tool-handlers.test.ts.
    expect(fixture.toolNames.filter((name) => name !== 'diagnostics')).toEqual(
      declarativeToolNames(),
    );
    expect(fixture.toolNames).toContain('diagnostics');
  });

  it('registers observe_session with the pinned name, title, and annotations', () => {
    const spec = observeSessionSpec();
    expect(spec.name).toBe(fixture.observeSession.name);
    expect(spec.title).toBe(fixture.observeSession.title);
    expect(spec.annotations).toEqual(fixture.observeSession.annotations);
  });

  it('pins the description in both places the package writes it', () => {
    // The tool file and the declarative registry each hold their own copy of
    // this string, so pinning one would let the other drift. Both are compared
    // to the fixture, which is where the wording lives.
    const declared = TOOL_DEFINITIONS.find((d) => d.name === 'observe_session');
    expect(declared).toBeDefined();
    expect(observeSessionSpec().description).toBe(
      fixture.observeSession.description,
    );
    expect(declared?.description).toBe(fixture.observeSession.description);
  });

  it('registers observe_session with the pinned input schema', () => {
    // Compare as JSON Schema rather than field by field: one canonical document
    // carries names, types, enum members, optionality, nesting, and
    // descriptions, so any of them drifting fails right here.
    expect(z.toJSONSchema(z.object(observeSessionSpec().inputSchema))).toEqual(
      fixture.observeSession.inputSchema,
    );
  });

  it('emits each pinned ordering on the path the fixture names it for', async () => {
    // Closes the loop the checks above leave open: they prove the fixture is
    // internally consistent and that the hint WORDING matches, but nothing so
    // far ties an ordering to the path it claims to describe. Without this, the
    // fixture could name any order for `statusEmptyFeed` and stay green. Each
    // case below drives the real handler down one path.
    const { hintOrder } = fixture.observeSession;

    expect(
      await hintKeysFor(
        {
          getFlow: async () => ({
            settings: [{ id: 'cfg_0', name: 'web', platform: 'web' }],
          }),
          startObserveSession: async () => session(),
        },
        { action: 'start', flowId: 'flow_1' },
      ),
    ).toEqual(hintOrder.start);

    expect(
      await hintKeysFor(
        { getObserveSession: async () => session() },
        { action: 'status', flowId: 'flow_1', sessionId: 'ses_1' },
      ),
    ).toEqual(hintOrder.statusWithRecords);

    expect(
      await hintKeysFor(
        { getObserveSession: async () => session({ recordsReceived: 0 }) },
        { action: 'status', flowId: 'flow_1', sessionId: 'ses_1' },
      ),
    ).toEqual(hintOrder.statusEmptyFeed);

    expect(
      await hintKeysFor(
        {
          getObserveSession: async () => session(),
          listJourneys: async () => journeys(null),
        },
        { action: 'status', flowId: 'flow_1' },
      ),
    ).toEqual(hintOrder.statusNoWindow);

    expect(
      await hintKeysFor(
        {
          endObserveSession: async () => undefined,
          listJourneys: async () => journeys('ses_live'),
        },
        { action: 'stop', flowId: 'flow_1' },
      ),
    ).toEqual(hintOrder.stopEnded);

    expect(
      await hintKeysFor(
        {
          endObserveSession: async () => undefined,
          listJourneys: async () => journeys(null),
        },
        { action: 'stop', flowId: 'flow_1' },
      ),
    ).toEqual(hintOrder.stopNoWindow);
  });

  it('declares exactly the hints its emission orderings reference', () => {
    const { hints, hintOrder } = fixture.observeSession;
    const declared = Object.keys(hints).sort();
    const referenced = Array.from(
      new Set(Object.values(hintOrder).flat()),
    ).sort();
    expect(referenced).toEqual(declared);
  });

  it('pins the hint constants to the fixture wording', () => {
    // The one place the imported constants are compared to text. Reword a hint
    // in the tool and this fails, naming the hint. Everywhere else the
    // constants stand in for hint IDENTITY only, never for wording.
    expect({
      SIMULATE_FIRST: HINT_SIMULATE_FIRST,
      PREVIEW_STREAMS: HINT_PREVIEW_STREAMS,
      READ: HINT_READ,
      STOP: HINT_STOP,
      EMPTY_FEED: HINT_EMPTY_FEED,
      ENDED: HINT_ENDED,
      NO_WINDOW: HINT_NO_WINDOW,
    }).toEqual(fixture.observeSession.hints);
  });

  it('keeps observe_journeys and observe_session the only observe tools', () => {
    // Verb strictness: Observe grows no third surface by accident. A new
    // `observe_*` tool must be a deliberate contract change.
    const observeTools = declarativeToolNames().filter((name) =>
      name.startsWith('observe_'),
    );
    expect(observeTools).toEqual(['observe_journeys', 'observe_session']);
  });
});
