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
import {
  createHubManageToolSpec,
  HUB_NOT_FOUND_HINT,
  HUB_HINT_RELEASE_GET,
  HUB_HINT_ROWS_ARE_DEPLOYMENTS,
  HUB_HINT_STEP_HISTORY,
  HUB_HINT_MASKED_ONLY,
  HUB_HINT_TRACE_STEP,
  HUB_HINT_WRITE_RATIONALE,
  HUB_HINT_SCAN_CAPPED,
  HUB_HINT_NO_MATCH,
  HUB_HINT_OPEN_RELEASE,
  HUB_HINT_RATIONALE_VISIBLE,
  HUB_HINT_CONFIRM_INDEX,
  HUB_HINT_THREADS_PAGE_CAPPED,
  HUB_HINT_NOTHING_DISCUSSED,
  HUB_HINT_NO_THREAD_ON_ANCHOR,
  HUB_HINT_THREADS_INDEX,
  HUB_HINT_MESSAGES_TRUNCATED,
  HUB_HINT_REPLY_OR_OPEN,
  HUB_HINT_RESOLVE_IN_APP,
  HUB_HINT_MESSAGE_VISIBLE,
  HUB_HINT_STAYS_RESOLVED,
  HUB_HINT_READ_BACK,
  HUB_HINT_THREAD_OPEN,
  HUB_HINT_KEEP_ONE_THREAD,
  HUB_HINT_KNOWLEDGE_PAGE_CAPPED,
  HUB_HINT_NOTHING_WRITTEN,
  HUB_HINT_KNOWLEDGE_INDEX,
  HUB_HINT_ENTRY_NAMES_FLOW,
  HUB_HINT_KNOWLEDGE_READ_ONLY,
  HUB_HINT_READ_FRAME,
} from '../tools/hub-manage.js';
import {
  createFrameManageToolSpec,
  FRAME_NOT_FOUND_HINT,
  FRAME_HINT_OPEN_PAGE_OR_GET,
  FRAME_HINT_NAMES_ARE_DOCUMENTATION,
  FRAME_HINT_NONE_YET,
  FRAME_HINT_MARK_SPACE,
  FRAME_HINT_READ_KNOWLEDGE,
  FRAME_HINT_NONE_ON_PAGE,
  FRAME_HINT_EXTENDS_BASE,
} from '../tools/frame-manage.js';
import { featureDenialHint } from '../tools/feature-gate.js';
import { stubClient } from './support/stub-client.js';
import { hintsOf } from './support/tool-result.js';
import fixture from './fixtures/mcp-surface-parity.json';
import type {
  ToolClient,
  ObserveSessionResult,
  JourneysResult,
  FlowReleaseWire,
  ReleaseDetailWire,
  VersionAnnotationWire,
  StepHistoryWire,
  HubThreadWire,
  KnowledgeThreadWire,
  FrameLeanWire,
  FrameWire,
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
 * NOTHING VERIFIES THE TWO COPIES ARE IDENTICAL. Each repository's test reads
 * only its own copy and no script or CI step compares them, so editing one
 * copy alone leaves both suites green while the two fixtures describe
 * different surfaces. Keeping them in step is a manual diff at edit time.
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

const OBSERVE_HINTS: Record<string, string> = {
  SIMULATE_FIRST: HINT_SIMULATE_FIRST,
  PREVIEW_STREAMS: HINT_PREVIEW_STREAMS,
  READ: HINT_READ,
  STOP: HINT_STOP,
  EMPTY_FEED: HINT_EMPTY_FEED,
  ENDED: HINT_ENDED,
  NO_WINDOW: HINT_NO_WINDOW,
};

const HUB_HINTS: Record<string, string> = {
  RELEASE_GET: HUB_HINT_RELEASE_GET,
  ROWS_ARE_DEPLOYMENTS: HUB_HINT_ROWS_ARE_DEPLOYMENTS,
  STEP_HISTORY: HUB_HINT_STEP_HISTORY,
  MASKED_ONLY: HUB_HINT_MASKED_ONLY,
  TRACE_STEP: HUB_HINT_TRACE_STEP,
  WRITE_RATIONALE: HUB_HINT_WRITE_RATIONALE,
  SCAN_CAPPED: HUB_HINT_SCAN_CAPPED,
  NO_MATCH: HUB_HINT_NO_MATCH,
  OPEN_RELEASE: HUB_HINT_OPEN_RELEASE,
  RATIONALE_VISIBLE: HUB_HINT_RATIONALE_VISIBLE,
  CONFIRM_INDEX: HUB_HINT_CONFIRM_INDEX,
  THREADS_PAGE_CAPPED: HUB_HINT_THREADS_PAGE_CAPPED,
  NOTHING_DISCUSSED: HUB_HINT_NOTHING_DISCUSSED,
  NO_THREAD_ON_ANCHOR: HUB_HINT_NO_THREAD_ON_ANCHOR,
  THREADS_INDEX: HUB_HINT_THREADS_INDEX,
  MESSAGES_TRUNCATED: HUB_HINT_MESSAGES_TRUNCATED,
  REPLY_OR_OPEN: HUB_HINT_REPLY_OR_OPEN,
  RESOLVE_IN_APP: HUB_HINT_RESOLVE_IN_APP,
  MESSAGE_VISIBLE: HUB_HINT_MESSAGE_VISIBLE,
  STAYS_RESOLVED: HUB_HINT_STAYS_RESOLVED,
  READ_BACK: HUB_HINT_READ_BACK,
  THREAD_OPEN: HUB_HINT_THREAD_OPEN,
  KEEP_ONE_THREAD: HUB_HINT_KEEP_ONE_THREAD,
  KNOWLEDGE_PAGE_CAPPED: HUB_HINT_KNOWLEDGE_PAGE_CAPPED,
  NOTHING_WRITTEN: HUB_HINT_NOTHING_WRITTEN,
  KNOWLEDGE_INDEX: HUB_HINT_KNOWLEDGE_INDEX,
  ENTRY_NAMES_FLOW: HUB_HINT_ENTRY_NAMES_FLOW,
  KNOWLEDGE_READ_ONLY: HUB_HINT_KNOWLEDGE_READ_ONLY,
  READ_FRAME: HUB_HINT_READ_FRAME,
};

const FRAME_HINTS: Record<string, string> = {
  OPEN_PAGE_OR_GET: FRAME_HINT_OPEN_PAGE_OR_GET,
  NAMES_ARE_DOCUMENTATION: FRAME_HINT_NAMES_ARE_DOCUMENTATION,
  NONE_YET: FRAME_HINT_NONE_YET,
  MARK_SPACE: FRAME_HINT_MARK_SPACE,
  READ_KNOWLEDGE: FRAME_HINT_READ_KNOWLEDGE,
  NONE_ON_PAGE: FRAME_HINT_NONE_ON_PAGE,
  EXTENDS_BASE: FRAME_HINT_EXTENDS_BASE,
};

/**
 * Hints the handler actually emitted, mapped back to their fixture key names.
 *
 * The wording-to-key direction is what makes an ordering assertion readable: a
 * failure names the hint that moved instead of printing two walls of prose. It
 * also refuses an unknown hint outright, so a hint added to a path without
 * being declared in the fixture fails here rather than passing unnoticed.
 */
function emittedHintKeys(
  hints: Record<string, string>,
  result: unknown,
): string[] {
  return hintsOf(result).map((hint) => {
    const entry = Object.entries(hints).find(([, value]) => value === hint);
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
  return emittedHintKeys(OBSERVE_HINTS, await spec.handler(input));
}

describe('MCP surface parity', () => {
  it('pins the tool roster the package declares', () => {
    // `diagnostics` is not in TOOL_DEFINITIONS at all: it is composed at
    // handler-build time from a client and a package version, so the roster is
    // pinned in two halves: the declarative registry below, and the full
    // 19-name record asserted in create-tool-handlers.test.ts.
    expect(fixture.toolNames.filter((name) => name !== 'diagnostics')).toEqual(
      declarativeToolNames(),
    );
    expect(fixture.toolNames).toContain('diagnostics');
    // The roster is compared against a SORTED registry above, so the fixture
    // has to be sorted too or the comparison would depend on the order someone
    // happened to paste names in. Held separately from the count so a failure
    // says which of the two went wrong.
    expect(fixture.toolNames).toEqual([...fixture.toolNames].sort());
    // The absolute count. Everything above still passes when a tool is added to
    // the registry AND the fixture in one edit, which is exactly the change
    // that should be deliberate: growing the published surface has to move this
    // number by hand.
    expect(fixture.toolNames).toHaveLength(19);
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

  it('emits exactly the pinned orderings, one per path the fixture names', async () => {
    // Closes the loop the checks above leave open: they prove the fixture is
    // internally consistent and that the hint WORDING matches, but nothing so
    // far ties an ordering to the path it claims to describe. Without this, the
    // fixture could name any order for `statusEmptyFeed` and stay green. Each
    // case below drives the real handler down one path.
    //
    // Collected into ONE object and compared ONCE, never path by path. A
    // per-path expectation proves its own value and nothing else, so deleting a
    // case would leave every other test here green: the completeness check
    // below compares the fixture's declared hints against its own referenced
    // hints, and never against the paths this test actually drives. Comparing
    // the whole map in a single assertion proves the orderings and the coverage
    // together, so a dropped path fails right here.
    const emitted: Record<string, string[]> = {
      start: await hintKeysFor(
        {
          getFlow: async () => ({
            settings: [{ id: 'cfg_0', name: 'web', platform: 'web' }],
          }),
          startObserveSession: async () => session(),
        },
        { action: 'start', flowId: 'flow_1' },
      ),
      statusWithRecords: await hintKeysFor(
        { getObserveSession: async () => session() },
        { action: 'status', flowId: 'flow_1', sessionId: 'ses_1' },
      ),
      statusEmptyFeed: await hintKeysFor(
        { getObserveSession: async () => session({ recordsReceived: 0 }) },
        { action: 'status', flowId: 'flow_1', sessionId: 'ses_1' },
      ),
      statusNoWindow: await hintKeysFor(
        {
          getObserveSession: async () => session(),
          listJourneys: async () => journeys(null),
        },
        { action: 'status', flowId: 'flow_1' },
      ),
      stopEnded: await hintKeysFor(
        {
          endObserveSession: async () => undefined,
          listJourneys: async () => journeys('ses_live'),
        },
        { action: 'stop', flowId: 'flow_1' },
      ),
      stopNoWindow: await hintKeysFor(
        {
          endObserveSession: async () => undefined,
          listJourneys: async () => journeys(null),
        },
        { action: 'stop', flowId: 'flow_1' },
      ),
    };

    expect(emitted).toEqual(fixture.observeSession.hintOrder);
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
    // Uniqueness first, because it is what makes the reverse lookup in
    // `emittedHintKeys` a function at all. That lookup scans VALUES, so two
    // constants sharing one sentence would both resolve to whichever key comes
    // first, and an ordering assertion would keep passing while the handler
    // emitted the other one. Asserted on the map the lookup actually reads.
    expect(new Set(Object.values(OBSERVE_HINTS)).size).toBe(
      Object.keys(OBSERVE_HINTS).length,
    );
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

/**
 * The two gated tools. Both are pinned the same way observe_session is, with
 * two additions the gate gives them: `denialHint`, the sentence a door's
 * FEATURE_NOT_AVAILABLE turns into, and `notFoundHint`, the one a NOT_FOUND
 * turns into. Those two travel with the surface because an agent reads them,
 * so a reword of either is a surface change like any other.
 */

const FRAME_ID = 'frm_V1StGXR8Z5jdHi6BmyT7K';

function releaseRow(): FlowReleaseWire {
  return {
    id: 'dv_1',
    deploymentId: 'dep_1',
    deploymentSlug: 'shop-web',
    deploymentType: 'web',
    versionNumber: 3,
    flowVersionId: 'ver_a',
    flowVersionNumber: 14,
    status: 'active',
    source: 'app',
    errorCode: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    createdBy: 'user_1',
    createdByLabel: 'Ayla',
    rationale: null,
  };
}

function annotation(): VersionAnnotationWire {
  return {
    versionId: 'ver_a',
    humanText: 'swapped the measurement id',
    generatedSummary: null,
    author: 'user_1',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

/** A release with a non-empty diff and no rationale: the plainest detail read. */
function releaseDetail(
  overrides: Partial<ReleaseDetailWire> = {},
): ReleaseDetailWire {
  return {
    versionId: 'ver_a',
    versionNumber: 14,
    contentHash: 'h14',
    createdAt: '2026-09-01T00:00:00.000Z',
    createdBy: 'user_1',
    rationale: null,
    diff: {
      prevVersionId: 'ver_p',
      prevVersionNumber: 13,
      text: '- id: G-1\n+ id: G-2',
      contentIdentical: false,
    },
    ...overrides,
  };
}

function stepHistory(
  overrides: Partial<StepHistoryWire> = {},
): StepHistoryWire {
  return {
    step: 'destination.ga4',
    flow: null,
    entries: [
      {
        versionId: 'ver_a',
        versionNumber: 14,
        createdAt: '2026-09-01T00:00:00.000Z',
        flow: 'web',
        change: 'changed',
        humanText: null,
        generatedSummary: null,
      },
    ],
    scanned: 20,
    truncated: false,
    entriesTruncated: false,
    ...overrides,
  };
}

function hubThread(overrides: Partial<HubThreadWire> = {}): HubThreadWire {
  return {
    id: 'thr_1',
    anchorType: 'release',
    anchorKey: 'ver_a',
    anchorLabel: 'v14',
    status: 'open',
    resolvedByVersionId: null,
    resolvedByVersionNumber: null,
    resolvedAt: null,
    resolvedBy: null,
    createdBy: 'user_1',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    messageCount: 4,
    ...overrides,
  };
}

function knowledgeThread(
  overrides: Partial<KnowledgeThreadWire> = {},
): KnowledgeThreadWire {
  return {
    kind: 'thread',
    id: 'kt_1',
    anchorType: 'tag',
    anchorKey: `${FRAME_ID}:m1`,
    anchorLabel: 'Add to cart',
    frameId: FRAME_ID,
    frameName: 'Cart',
    flowId: 'flow_1',
    subjectKey: 'product.add',
    spatial: null,
    validity: { tier: 'none' },
    freshness: 'unknown',
    author: { kind: 'user', id: 'user_1', label: 'Ayla' },
    source: 'tag_mode',
    updatedAt: '2026-09-01T00:00:00.000Z',
    status: 'open',
    createdAt: '2026-09-01T00:00:00.000Z',
    messageCount: 4,
    ...overrides,
  };
}

function leanFrame(overrides: Partial<FrameLeanWire> = {}): FrameLeanWire {
  return {
    id: FRAME_ID,
    projectId: 'proj_1',
    name: 'Cart',
    parentId: null,
    placements: [{ id: 'pl_1', rect: { x: 0.1, y: 0.2, w: 0.5, h: 0.3 } }],
    size: { width: 800, height: 400 },
    extends: null,
    source: {
      kind: 'page',
      key: 'https://shop.example/cart',
      url: 'https://shop.example/cart?utm=1',
    },
    origin: 'drawn',
    flowId: 'flow_1',
    screenshot: null,
    version: 3,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    createdBy: 'user_1',
    updatedBy: 'user_1',
    deletedAt: null,
    ...overrides,
  };
}

function fullFrame(overrides: Partial<FrameWire> = {}): FrameWire {
  return { ...leanFrame(), marks: { entities: [] }, ...overrides };
}

async function hubHintKeysFor(
  overrides: Partial<ToolClient>,
  input: Record<string, unknown>,
): Promise<string[]> {
  const spec = createHubManageToolSpec(
    stubClient({ getDefaultProject: () => 'proj_1', ...overrides }),
  );
  return emittedHintKeys(HUB_HINTS, await spec.handler(input));
}

async function frameHintKeysFor(
  overrides: Partial<ToolClient>,
  input: Record<string, unknown>,
): Promise<string[]> {
  const spec = createFrameManageToolSpec(
    stubClient({ getDefaultProject: () => 'proj_1', ...overrides }),
  );
  return emittedHintKeys(FRAME_HINTS, await spec.handler(input));
}

describe('MCP surface parity: hub_manage', () => {
  const hubSpec = () => createHubManageToolSpec(stubClient());

  it('registers hub_manage with the pinned name, title, and annotations', () => {
    const spec = hubSpec();
    expect(spec.name).toBe(fixture.hubManage.name);
    expect(spec.title).toBe(fixture.hubManage.title);
    expect(spec.annotations).toEqual(fixture.hubManage.annotations);
  });

  it('pins the description in both places the package writes it', () => {
    const declared = TOOL_DEFINITIONS.find((d) => d.name === 'hub_manage');
    expect(declared).toBeDefined();
    expect(hubSpec().description).toBe(fixture.hubManage.description);
    expect(declared?.description).toBe(fixture.hubManage.description);
  });

  it('registers hub_manage with the pinned input schema', () => {
    expect(z.toJSONSchema(z.object(hubSpec().inputSchema))).toEqual(
      fixture.hubManage.inputSchema,
    );
  });

  it('pins the two hints a refusal turns into', () => {
    // Neither is emitted on a success path, so neither is reachable through
    // hintOrder. They are the sentences an agent reads when the tool refuses,
    // which makes them surface, and this is where their wording is pinned.
    expect(featureDenialHint('hub')).toBe(fixture.hubManage.denialHint);
    expect(HUB_NOT_FOUND_HINT).toBe(fixture.hubManage.notFoundHint);
  });

  it('emits exactly the pinned orderings, one per path the fixture names', async () => {
    // Collected into ONE object and compared ONCE. See the note on the
    // observe_session block: a per-path expectation cannot notice its own
    // deletion, and nothing else here would. This matters most for the copy of
    // this fixture that the app pins, since a second test exercising three of
    // these eighteen paths would otherwise pass while claiming the same surface.
    const emitted: Record<string, string[]> = {
      releases: await hubHintKeysFor(
        {
          listReleases: async () => ({
            releases: [releaseRow()],
            total: 1,
            limit: 20,
            offset: 0,
          }),
        },
        { action: 'releases', flowId: 'flow_1' },
      ),
      releaseGetMaskedOnly: await hubHintKeysFor(
        {
          getRelease: async () =>
            releaseDetail({
              diff: {
                prevVersionId: 'ver_p',
                prevVersionNumber: 13,
                text: '',
                contentIdentical: false,
              },
            }),
        },
        { action: 'release_get', flowId: 'flow_1', versionId: 'ver_a' },
      ),
      releaseGetWithRationale: await hubHintKeysFor(
        { getRelease: async () => releaseDetail({ rationale: annotation() }) },
        { action: 'release_get', flowId: 'flow_1', versionId: 'ver_a' },
      ),
      releaseGetNoRationale: await hubHintKeysFor(
        { getRelease: async () => releaseDetail() },
        { action: 'release_get', flowId: 'flow_1', versionId: 'ver_a' },
      ),
      stepHistoryCapped: await hubHintKeysFor(
        {
          listStepHistory: async () => stepHistory({ entriesTruncated: true }),
        },
        { action: 'step_history', flowId: 'flow_1', step: 'destination.ga4' },
      ),
      stepHistoryEmpty: await hubHintKeysFor(
        { listStepHistory: async () => stepHistory({ entries: [] }) },
        { action: 'step_history', flowId: 'flow_1', step: 'destination.ga4' },
      ),
      stepHistoryMatched: await hubHintKeysFor(
        { listStepHistory: async () => stepHistory() },
        { action: 'step_history', flowId: 'flow_1', step: 'destination.ga4' },
      ),
      rationaleSet: await hubHintKeysFor(
        {
          // The write resolves the release through the detail read first, so
          // both have to answer for this path to run at all.
          getRelease: async () => releaseDetail(),
          setReleaseRationale: async () => annotation(),
        },
        {
          action: 'rationale_set',
          flowId: 'flow_1',
          versionId: 'ver_a',
          text: 'swapped the measurement id',
        },
      ),
      threadsIndexEmpty: await hubHintKeysFor(
        { listThreads: async () => ({ threads: [], hasMoreThreads: false }) },
        { action: 'threads', flowId: 'flow_1' },
      ),
      threadsAnchorEmpty: await hubHintKeysFor(
        {
          getRelease: async () => releaseDetail(),
          listThreads: async () => ({ threads: [], hasMoreThreads: false }),
        },
        { action: 'threads', flowId: 'flow_1', versionId: 'ver_a' },
      ),
      threadsIndexCapped: await hubHintKeysFor(
        {
          listThreads: async () => ({
            threads: [hubThread()],
            hasMoreThreads: true,
          }),
        },
        { action: 'threads', flowId: 'flow_1' },
      ),
      threadsAnchorTruncated: await hubHintKeysFor(
        {
          getRelease: async () => releaseDetail(),
          listThreads: async () => ({
            threads: [
              hubThread({
                hasMoreMessages: true,
                messages: [
                  {
                    id: 'msg_1',
                    author: 'user_1',
                    text: 'looks right',
                    createdAt: '2026-09-01T00:00:00.000Z',
                  },
                ],
              }),
            ],
            hasMoreThreads: false,
          }),
        },
        { action: 'threads', flowId: 'flow_1', versionId: 'ver_a' },
      ),
      noteAddReplyOpen: await hubHintKeysFor(
        { addThreadMessage: async () => hubThread({ status: 'open' }) },
        {
          action: 'note_add',
          flowId: 'flow_1',
          threadId: 'thr_1',
          text: 'agreed',
        },
      ),
      noteAddReplyResolved: await hubHintKeysFor(
        { addThreadMessage: async () => hubThread({ status: 'resolved' }) },
        {
          action: 'note_add',
          flowId: 'flow_1',
          threadId: 'thr_1',
          text: 'agreed',
        },
      ),
      noteAddOpen: await hubHintKeysFor(
        {
          createThread: async () =>
            hubThread({
              anchorType: 'step',
              anchorKey: 'destination.ga4',
              anchorLabel: 'destination.ga4',
            }),
        },
        {
          action: 'note_add',
          flowId: 'flow_1',
          anchorType: 'step',
          anchorKey: 'destination.ga4',
          text: 'why this changed',
        },
      ),
      knowledgeEmpty: await hubHintKeysFor(
        { listKnowledge: async () => ({ entries: [], hasMoreEntries: false }) },
        { action: 'knowledge' },
      ),
      knowledgeIndexCapped: await hubHintKeysFor(
        {
          listKnowledge: async () => ({
            entries: [knowledgeThread()],
            hasMoreEntries: true,
          }),
        },
        { action: 'knowledge' },
      ),
      knowledgeMarkTruncated: await hubHintKeysFor(
        {
          listKnowledge: async () => ({
            entries: [
              knowledgeThread({
                hasMoreMessages: true,
                messages: [
                  {
                    id: 'km_1',
                    author: 'user_1',
                    authorLabel: 'Ayla',
                    text: 'fires on the CTA',
                    createdAt: '2026-09-01T00:00:00.000Z',
                    clientMessageId: null,
                  },
                ],
              }),
            ],
            hasMoreEntries: false,
          }),
        },
        { action: 'knowledge', frameId: FRAME_ID, markId: 'm1' },
      ),
    };

    expect(emitted).toEqual(fixture.hubManage.hintOrder);
  });

  it('declares exactly the hints its emission orderings reference', () => {
    const { hints, hintOrder } = fixture.hubManage;
    const declared = Object.keys(hints).sort();
    const referenced = Array.from(
      new Set(Object.values(hintOrder).flat()),
    ).sort();
    expect(referenced).toEqual(declared);
  });

  it('pins the hint constants to the fixture wording', () => {
    // Uniqueness first: `emittedHintKeys` maps a hint back to a key by scanning
    // VALUES, so two constants sharing one sentence would both resolve to
    // whichever key comes first and every ordering above would keep passing
    // while the handler emitted the other one.
    expect(new Set(Object.values(HUB_HINTS)).size).toBe(
      Object.keys(HUB_HINTS).length,
    );
    expect(HUB_HINTS).toEqual(fixture.hubManage.hints);
  });
});

describe('MCP surface parity: frame_manage', () => {
  const frameSpec = () => createFrameManageToolSpec(stubClient());

  it('registers frame_manage with the pinned name, title, and annotations', () => {
    const spec = frameSpec();
    expect(spec.name).toBe(fixture.frameManage.name);
    expect(spec.title).toBe(fixture.frameManage.title);
    expect(spec.annotations).toEqual(fixture.frameManage.annotations);
  });

  it('pins the description in both places the package writes it', () => {
    const declared = TOOL_DEFINITIONS.find((d) => d.name === 'frame_manage');
    expect(declared).toBeDefined();
    expect(frameSpec().description).toBe(fixture.frameManage.description);
    expect(declared?.description).toBe(fixture.frameManage.description);
  });

  it('registers frame_manage with the pinned input schema', () => {
    expect(z.toJSONSchema(z.object(frameSpec().inputSchema))).toEqual(
      fixture.frameManage.inputSchema,
    );
  });

  it('pins the two hints a refusal turns into', () => {
    expect(featureDenialHint('frames')).toBe(fixture.frameManage.denialHint);
    expect(FRAME_NOT_FOUND_HINT).toBe(fixture.frameManage.notFoundHint);
  });

  it('emits exactly the pinned orderings, one per path the fixture names', async () => {
    // One object, one comparison, for the reason stated on the hub_manage
    // block: coverage of the pinned paths is part of what this asserts.
    const emitted: Record<string, string[]> = {
      list: await frameHintKeysFor(
        { listFrames: async () => ({ frames: [leanFrame()] }) },
        { action: 'list' },
      ),
      listEmpty: await frameHintKeysFor(
        { listFrames: async () => ({ frames: [] }) },
        { action: 'list' },
      ),
      page: await frameHintKeysFor(
        { listPageFrames: async () => ({ frames: [fullFrame()] }) },
        { action: 'page', pageKey: 'https://shop.example/cart' },
      ),
      pageEmpty: await frameHintKeysFor(
        { listPageFrames: async () => ({ frames: [] }) },
        { action: 'page', pageKey: 'https://shop.example/cart' },
      ),
      getVariation: await frameHintKeysFor(
        { getFrame: async () => fullFrame({ extends: 'frm_base' }) },
        { action: 'get', frameId: FRAME_ID },
      ),
      getBase: await frameHintKeysFor(
        { getFrame: async () => fullFrame() },
        { action: 'get', frameId: FRAME_ID },
      ),
    };

    expect(emitted).toEqual(fixture.frameManage.hintOrder);
  });

  it('declares exactly the hints its emission orderings reference', () => {
    const { hints, hintOrder } = fixture.frameManage;
    const declared = Object.keys(hints).sort();
    const referenced = Array.from(
      new Set(Object.values(hintOrder).flat()),
    ).sort();
    expect(referenced).toEqual(declared);
  });

  it('pins the hint constants to the fixture wording', () => {
    // Uniqueness first: `emittedHintKeys` maps a hint back to a key by scanning
    // VALUES, so two constants sharing one sentence would both resolve to
    // whichever key comes first and every ordering above would keep passing
    // while the handler emitted the other one.
    expect(new Set(Object.values(FRAME_HINTS)).size).toBe(
      Object.keys(FRAME_HINTS).length,
    );
    expect(FRAME_HINTS).toEqual(fixture.frameManage.hints);
  });
});
