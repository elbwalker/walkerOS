import { stubClient } from '../support/stub-client.js';
import {
  createHubManageToolSpec,
  HUB_HINT_RELEASE_GET,
  HUB_HINT_ROWS_ARE_DEPLOYMENTS,
  HUB_HINT_STEP_HISTORY,
  HUB_HINT_MASKED_ONLY,
  HUB_HINT_WRITE_RATIONALE,
  HUB_HINT_TRACE_STEP,
  HUB_HINT_SCAN_CAPPED,
  HUB_HINT_NO_MATCH,
  HUB_HINT_OPEN_RELEASE,
  HUB_HINT_NOTHING_WRITTEN,
  HUB_HINT_READ_FRAME,
} from '../../tools/hub-manage.js';
import { featureDenialHint } from '../../tools/feature-gate.js';
import type {
  FlowReleaseWire,
  ReleaseDetailWire,
  StepHistoryWire,
  HubThreadWire,
  KnowledgeEntryWire,
  ToolClient,
} from '../../tool-client.js';
import { structured, record, rows, hintsOf } from '../support/tool-result.js';

class CodedError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

function release(overrides: Partial<FlowReleaseWire> = {}): FlowReleaseWire {
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
    ...overrides,
  };
}

function detail(overrides: Partial<ReleaseDetailWire> = {}): ReleaseDetailWire {
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

/**
 * A scan that found one release. The entry carries rationale text on the wire,
 * which is what makes the omission assertion below meaningful.
 */
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
        humanText: 'swapped the measurement id',
        generatedSummary: 'destination.ga4 changed',
      },
    ],
    scanned: 20,
    truncated: false,
    entriesTruncated: false,
    ...overrides,
  };
}

function thread(overrides: Partial<HubThreadWire> = {}): HubThreadWire {
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
    messageCount: 1,
    ...overrides,
  };
}

function description(): KnowledgeEntryWire {
  return {
    kind: 'description',
    id: 'kd_1',
    anchorType: 'tag',
    anchorKey: 'frm_V1StGXR8Z5jdHi6BmyT7K:m1',
    anchorLabel: 'Add to cart',
    frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
    frameName: 'Cart',
    flowId: 'flow_1',
    subjectKey: 'product.add',
    spatial: { at: { x: 0.2, y: 0.4 }, element: { css: 'button' } },
    validity: { tier: 'none' },
    freshness: 'unknown',
    author: { kind: 'user', id: 'user_1', label: 'Ayla' },
    source: 'tag_mode',
    updatedAt: '2026-09-01T00:00:00.000Z',
    body: 'Fires on the CTA',
  };
}

const withProject = (overrides: Partial<ToolClient> = {}) =>
  createHubManageToolSpec(
    stubClient({ getDefaultProject: () => 'proj_1', ...overrides }),
  );

describe('hub_manage', () => {
  it('is one action tool with the pinned name and non-idempotent annotations', () => {
    const spec = withProject();
    expect(spec.name).toBe('hub_manage');
    expect(spec.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('rejects an unknown action with INVALID_INPUT', async () => {
    const result = await withProject().handler({
      action: 'delete',
      flowId: 'flow_1',
    });
    expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('asks for a project when there is none to fall back to', async () => {
    const result = await createHubManageToolSpec(stubClient()).handler({
      action: 'releases',
      flowId: 'flow_1',
    });
    expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('refuses a null rationale instead of clearing the note', async () => {
    const result = await withProject().handler({
      action: 'rationale_set',
      flowId: 'flow_1',
      versionId: 'ver_a',
      text: null,
    });
    expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('refuses whitespace-only text', async () => {
    const result = await withProject().handler({
      action: 'note_add',
      flowId: 'flow_1',
      threadId: 'thr_1',
      text: '   ',
    });
    expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('refuses a page anchor', async () => {
    const result = await withProject().handler({
      action: 'note_add',
      flowId: 'flow_1',
      anchorType: 'page',
      anchorKey: 'x',
      text: 'hi',
    });
    expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('passes a feature denial through with the hub hint', async () => {
    const result = await withProject({
      listReleases: async () => {
        throw new CodedError(
          'hub is not available on your current plan',
          'FEATURE_NOT_AVAILABLE',
        );
      },
    }).handler({ action: 'releases', flowId: 'flow_1' });
    expect(structured(result)).toMatchObject({
      code: 'FEATURE_NOT_AVAILABLE',
      hint: featureDenialHint('hub'),
    });
  });

  describe('releases', () => {
    it('renames the spine fields and wraps the rationale first line', async () => {
      const result = await withProject({
        listReleases: async () => ({
          releases: [
            release({
              rationale: {
                hasHumanText: true,
                hasGeneratedSummary: false,
                firstLine: 'Because',
              },
            }),
          ],
          total: 1,
          limit: 20,
          offset: 0,
        }),
      }).handler({ action: 'releases', flowId: 'flow_1' });
      expect(structured(result)).toMatchObject({
        total: 1,
        releases: [
          {
            versionId: 'ver_a',
            versionNumber: 14,
            deployment: 'shop-web',
            deploymentType: 'web',
            deploymentAttempt: 3,
            status: 'active',
            source: 'app',
            errorCode: null,
            createdAt: '2026-09-01T00:00:00.000Z',
            createdBy: 'user_1',
            rationale: {
              hasHumanText: true,
              hasGeneratedSummary: false,
              firstLine: '<user_data>Because</user_data>',
            },
          },
        ],
      });
      expect(hintsOf(result)).toEqual([
        HUB_HINT_RELEASE_GET,
        HUB_HINT_ROWS_ARE_DEPLOYMENTS,
        HUB_HINT_STEP_HISTORY,
      ]);
    });

    it('treats an absent rationale summary as none', async () => {
      const result = await withProject({
        listReleases: async () => ({
          releases: [release({ rationale: undefined })],
          total: 1,
          limit: 20,
          offset: 0,
        }),
      }).handler({ action: 'releases', flowId: 'flow_1' });
      expect(structured(result)).toMatchObject({
        releases: [{ rationale: null }],
      });
    });
  });

  describe('release_get', () => {
    it('requires an address', async () => {
      const result = await withProject().handler({
        action: 'release_get',
        flowId: 'flow_1',
      });
      expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('wraps the diff text and hints at writing a rationale when there is none', async () => {
      const result = await withProject({
        getRelease: async () => detail(),
      }).handler({
        action: 'release_get',
        flowId: 'flow_1',
        versionNumber: 14,
      });
      expect(structured(result)).toMatchObject({
        versionId: 'ver_a',
        diff: {
          prevVersionId: 'ver_p',
          prevVersionNumber: 13,
          text: '<user_data>- id: G-1\n+ id: G-2</user_data>',
          contentIdentical: false,
          note: null,
        },
        diffUnavailable: null,
      });
      expect(hintsOf(result)).toEqual([HUB_HINT_WRITE_RATIONALE]);
    });

    it('does not call a masked-only change identical', async () => {
      const result = await withProject({
        getRelease: async () =>
          detail({
            diff: {
              prevVersionId: 'ver_p',
              prevVersionNumber: 13,
              text: '',
              contentIdentical: false,
            },
          }),
      }).handler({
        action: 'release_get',
        flowId: 'flow_1',
        versionId: 'ver_a',
      });
      expect(structured(result)).toMatchObject({
        diff: { text: null, contentIdentical: false },
      });
      expect(record(structured(result).diff).note).toContain('masked');
      expect(hintsOf(result)).toEqual([HUB_HINT_MASKED_ONLY]);
    });

    it('says why the oldest release has no diff and points at step history when rationale exists', async () => {
      const result = await withProject({
        getRelease: async () =>
          detail({
            diff: null,
            rationale: {
              versionId: 'ver_a',
              humanText: 'why',
              generatedSummary: null,
              author: 'user_1',
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-01T00:00:00.000Z',
            },
          }),
      }).handler({
        action: 'release_get',
        flowId: 'flow_1',
        versionId: 'ver_a',
      });
      expect(structured(result)).toMatchObject({
        diff: null,
        rationale: { humanText: '<user_data>why</user_data>' },
      });
      expect(typeof structured(result).diffUnavailable).toBe('string');
      expect(hintsOf(result)).toEqual([HUB_HINT_TRACE_STEP]);
    });

    it('passes NOT_FOUND through with the discovery hint', async () => {
      const result = await withProject({
        getRelease: async () => {
          throw new CodedError('Release not found', 'NOT_FOUND');
        },
      }).handler({
        action: 'release_get',
        flowId: 'flow_1',
        versionId: 'ver_x',
      });
      expect(structured(result)).toMatchObject({
        code: 'NOT_FOUND',
        error: 'Release not found',
      });
      expect(typeof structured(result).hint).toBe('string');
    });
  });

  describe('step_history', () => {
    it('requires a step', async () => {
      const result = await withProject().handler({
        action: 'step_history',
        flowId: 'flow_1',
      });
      expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('leaves the rationale text out of the scan', async () => {
      const listStepHistory = jest.fn(async () => stepHistory());
      const result = await withProject({ listStepHistory }).handler({
        action: 'step_history',
        flowId: 'flow_1',
        step: 'destination.ga4',
      });
      expect(listStepHistory).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        step: 'destination.ga4',
      });
      // The scan is an index: release_get is the detail read. An entry that
      // carried the note would put unwrapped user text in model context, so
      // the surfaced shape is pinned exhaustively and both text fields are
      // named as the ones that must never appear.
      const entry = rows(structured(result).entries)[0];
      expect(entry).toEqual({
        versionId: 'ver_a',
        versionNumber: 14,
        createdAt: '2026-09-01T00:00:00.000Z',
        flow: 'web',
        change: 'changed',
      });
      expect(entry).not.toHaveProperty('humanText');
      expect(entry).not.toHaveProperty('generatedSummary');
    });

    const scanCases: Array<{
      label: string;
      history: Partial<StepHistoryWire>;
      hint: string;
    }> = [
      {
        label: 'stopped at the entry cap',
        history: { entriesTruncated: true },
        hint: HUB_HINT_SCAN_CAPPED,
      },
      {
        label: 'matched nothing',
        history: { entries: [] },
        hint: HUB_HINT_NO_MATCH,
      },
      {
        label: 'found a release that touched the step',
        history: {},
        hint: HUB_HINT_OPEN_RELEASE,
      },
    ];

    it.each(scanCases)(
      'points somewhere useful when the scan $label',
      async ({ history, hint }) => {
        const result = await withProject({
          listStepHistory: async () => stepHistory(history),
        }).handler({
          action: 'step_history',
          flowId: 'flow_1',
          step: 'destination.ga4',
        });
        expect(hintsOf(result)).toEqual([hint]);
      },
    );
  });

  describe('rationale_set', () => {
    it('resolves a versionNumber through getRelease before writing', async () => {
      const setReleaseRationale = jest.fn(async () => ({
        versionId: 'ver_a',
        humanText: 'why',
        generatedSummary: null,
        author: 'user_1',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }));
      const result = await withProject({
        getRelease: async () => detail(),
        setReleaseRationale,
      }).handler({
        action: 'rationale_set',
        flowId: 'flow_1',
        versionNumber: 14,
        text: 'why',
      });
      expect(setReleaseRationale).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        versionId: 'ver_a',
        text: 'why',
      });
      expect(structured(result)).toMatchObject({
        versionId: 'ver_a',
        versionNumber: 14,
        rationale: { humanText: '<user_data>why</user_data>' },
      });
    });

    it('refuses a release id belonging to a sibling flow before writing', async () => {
      const setReleaseRationale = jest.fn();
      const result = await withProject({
        getRelease: async () => {
          throw new CodedError('Release not found', 'NOT_FOUND');
        },
        setReleaseRationale,
      }).handler({
        action: 'rationale_set',
        flowId: 'flow_1',
        versionId: 'ver_other',
        text: 'why',
      });
      expect(structured(result)).toMatchObject({ code: 'NOT_FOUND' });
      expect(setReleaseRationale).not.toHaveBeenCalled();
    });
  });

  describe('threads', () => {
    it('reads a whole-flow index without message bodies', async () => {
      const listThreads = jest.fn(async () => ({
        threads: [thread()],
        hasMoreThreads: true,
      }));
      const result = await withProject({ listThreads }).handler({
        action: 'threads',
        flowId: 'flow_1',
        limit: 500,
      });
      expect(listThreads).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        includeMessages: false,
        limit: 100,
      });
      expect(structured(result)).toMatchObject({
        hasMoreThreads: true,
        threads: [
          { threadId: 'thr_1', anchorLabel: '<user_data>v14</user_data>' },
        ],
      });
      expect(rows(structured(result).threads)[0]).not.toHaveProperty(
        'messages',
      );
    });

    it('resolves a release anchor through getRelease and attaches bodies', async () => {
      const listThreads = jest.fn(async () => ({
        threads: [
          thread({
            messages: [
              {
                id: 'msg_1',
                author: 'user_1',
                text: 'ok?',
                createdAt: '2026-09-01T00:00:00.000Z',
              },
            ],
            hasMoreMessages: true,
          }),
        ],
        hasMoreThreads: false,
      }));
      const result = await withProject({
        getRelease: async () => detail(),
        listThreads,
      }).handler({ action: 'threads', flowId: 'flow_1', versionNumber: 14 });
      expect(listThreads).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        includeMessages: true,
        anchorType: 'release',
        anchorKey: 'ver_a',
      });
      expect(structured(result)).toMatchObject({
        threads: [
          {
            hasMoreMessages: true,
            messages: [
              { author: 'user_1', text: '<user_data>ok?</user_data>' },
            ],
          },
        ],
      });
    });
  });

  describe('note_add', () => {
    it('replies into the named thread', async () => {
      const addThreadMessage = jest.fn(async () => thread({ messageCount: 2 }));
      const result = await withProject({ addThreadMessage }).handler({
        action: 'note_add',
        flowId: 'flow_1',
        threadId: 'thr_1',
        text: 'reply',
      });
      expect(addThreadMessage).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        threadId: 'thr_1',
        text: 'reply',
      });
      expect(structured(result)).toMatchObject({
        thread: { threadId: 'thr_1', messageCount: 2 },
      });
    });

    it('opens a thread on a release addressed by number', async () => {
      const createThread = jest.fn(async () => thread());
      await withProject({
        getRelease: async () => detail(),
        createThread,
      }).handler({
        action: 'note_add',
        flowId: 'flow_1',
        versionNumber: 14,
        text: 'hi',
      });
      expect(createThread).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        anchorType: 'release',
        anchorKey: 'ver_a',
        text: 'hi',
      });
    });

    it('opens a thread on a step anchor with the given label', async () => {
      const createThread = jest.fn(async () =>
        thread({
          anchorType: 'step',
          anchorKey: 'destination.ga4',
          anchorLabel: 'GA4',
        }),
      );
      await withProject({ createThread }).handler({
        action: 'note_add',
        flowId: 'flow_1',
        anchorType: 'step',
        anchorKey: 'destination.ga4',
        anchorLabel: 'GA4',
        text: 'hi',
      });
      expect(createThread).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        anchorType: 'step',
        anchorKey: 'destination.ga4',
        anchorLabel: 'GA4',
        text: 'hi',
      });
    });

    it('refuses a note with nowhere to go', async () => {
      const result = await withProject().handler({
        action: 'note_add',
        flowId: 'flow_1',
        text: 'hi',
      });
      expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
    });
  });

  describe('knowledge', () => {
    it('refuses a flowId rather than answering an unnarrowed page', async () => {
      const result = await withProject().handler({
        action: 'knowledge',
        flowId: 'flow_1',
      });
      expect(structured(result)).toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('attaches bodies only for one mark and drops the DOM anchor', async () => {
      const listKnowledge = jest.fn(async () => ({
        entries: [description()],
        hasMoreEntries: false,
      }));
      const result = await withProject({ listKnowledge }).handler({
        action: 'knowledge',
        frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
        markId: 'm1',
      });
      expect(listKnowledge).toHaveBeenCalledWith({
        projectId: 'proj_1',
        includeMessages: true,
        frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
        markId: 'm1',
      });
      const entry = rows(structured(result).entries)[0];
      expect(entry).toMatchObject({
        kind: 'description',
        frameId: 'frm_V1StGXR8Z5jdHi6BmyT7K',
        frameName: '<user_data>Cart</user_data>',
        body: '<user_data>Fires on the CTA</user_data>',
        author: { label: '<user_data>Ayla</user_data>' },
      });
      expect(entry).not.toHaveProperty('spatial');
      expect(hintsOf(result)).toContain(HUB_HINT_READ_FRAME);
    });

    it('says when nothing has been written', async () => {
      const result = await withProject({
        listKnowledge: async () => ({ entries: [], hasMoreEntries: false }),
      }).handler({ action: 'knowledge' });
      expect(hintsOf(result)).toEqual([HUB_HINT_NOTHING_WRITTEN]);
    });
  });
});
