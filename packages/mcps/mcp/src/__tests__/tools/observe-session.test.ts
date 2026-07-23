import './../support/version.js';

import { z } from 'zod';
import { createObserveSessionToolSpec } from '../../tools/observe-session.js';
import { createFlowManageToolSpec } from '../../tools/flow-manage.js';
import { TOOL_DEFINITIONS } from '../../tool-definitions.js';
import { stubClient } from '../support/stub-client.js';
import type {
  ObserveSessionResult,
  JourneysResult,
} from '../../tool-client.js';

type Structured = {
  structuredContent: Record<string, unknown>;
  content: Array<{ text: string }>;
  isError?: boolean;
};

function hintsOf(result: unknown): string[] {
  const structured = (result as Structured).structuredContent;
  const hints = structured._hints as { next?: string[] } | undefined;
  return hints?.next ?? [];
}

function errorOf(result: unknown): string {
  const r = result as Structured;
  expect(r.isError).toBe(true);
  const parsed = JSON.parse(r.content[0].text) as { error: string };
  return parsed.error;
}

/**
 * A flow whose settings carry both platforms, the shape `GET /flows/:id`
 * returns (`FlowSettingsSummary[]`). Arm translation reads nothing else.
 */
function flowWithSettings(
  settings: Array<{ name: string; platform: 'web' | 'server' }>,
) {
  return {
    id: 'flow_1',
    name: 'Demo',
    config: {},
    settings: settings.map((entry, index) => ({
      id: `cfg_${index}`,
      name: entry.name,
      platform: entry.platform,
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:00:00.000Z',
    })),
    createdAt: '2026-07-18T00:00:00.000Z',
    updatedAt: '2026-07-18T00:00:00.000Z',
  };
}

/**
 * The web feed credential, and the activation URL the app actually mints. The
 * credential rides IN the URL as the elbObserve companion, so a fixture that
 * omitted it would let a "no secrets in the output" assertion pass for the
 * wrong reason.
 */
const FEED_CREDENTIAL = 'obsw_pb1.ses_1.tok';
const ACTIVATION_URL =
  'https://shop.example.com?elbPreview=gr_x&elbObserve=obsw_pb1.ses_1.tok&elbPreviewSession=ses_1';

/** A session response shaped exactly like the app's `ObserveSessionResponse`. */
function sessionResult(
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
      activationUrl: ACTIVATION_URL,
      credential: FEED_CREDENTIAL,
      previewEnabled: true,
      bundleUrl: 'https://cdn.example.com/bundle.js',
      url: 'https://observer.example.com',
      binding: 'pb_abc',
    },
    server: {
      endpoint: 'https://container.example.com',
      env: {
        WALKEROS_OBSERVER_URL: 'https://observer.example.com',
        WALKEROS_DEPLOYMENT_ID: 'dep_1',
        WALKEROS_INGEST_TOKEN: 'tok_supersecret',
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

describe('observe_session tool', () => {
  describe('registration', () => {
    it('is verb-prefixed and not a generic "session" tool', () => {
      const spec = createObserveSessionToolSpec(stubClient());
      expect(spec.name).toBe('observe_session');
    });

    it('exposes exactly start/status/stop actions', () => {
      const spec = createObserveSessionToolSpec(stubClient());
      const action = spec.inputSchema.action;
      expect(action).toBeDefined();
      expect(spec.inputSchema.arms).toBeDefined();
      expect(spec.inputSchema.origins).toBeDefined();
      expect(spec.inputSchema.level).toBeDefined();
      expect(spec.inputSchema.replace).toBeDefined();
    });

    it('requires flowId', async () => {
      const spec = createObserveSessionToolSpec(stubClient());
      const result = await spec.handler({ action: 'start' });
      expect(errorOf(result)).toContain('flowId is required');
    });

    it('rejects arms.container false on both schema surfaces, which neither can honour', () => {
      // A web settings referencing a server flow provisions the container
      // regardless, so accepting false would let the schema state a
      // suppression the contract cannot deliver. The spec and the declarative
      // definition each carry a copy of the shape, so pin both.
      const definition = TOOL_DEFINITIONS.find(
        (entry) => entry.name === 'observe_session',
      );
      if (!definition)
        throw new Error('observe_session is not in TOOL_DEFINITIONS');

      const input = { action: 'start', flowId: 'flow_1' };
      for (const shape of [
        createObserveSessionToolSpec(stubClient()).inputSchema,
        definition.inputSchema,
      ]) {
        const schema = z.object(shape);
        expect(schema.safeParse(input).success).toBe(true);
        expect(
          schema.safeParse({ ...input, arms: { container: true } }).success,
        ).toBe(true);
        expect(
          schema.safeParse({ ...input, arms: { container: false } }).success,
        ).toBe(false);
      }
    });
  });

  describe('start: arms translate onto the settingsName contract', () => {
    it('default-attaches the single web settings when no arms are given', async () => {
      const getFlow = jest.fn().mockResolvedValue(
        flowWithSettings([
          { name: 'web', platform: 'web' },
          { name: 'server', platform: 'server' },
        ]),
      );
      const startObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      await spec.handler({ action: 'start', flowId: 'flow_1' });

      expect(startObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        settingsName: 'web',
      });
    });

    it('uses the named preview arm as the settingsName', async () => {
      const getFlow = jest.fn().mockResolvedValue(
        flowWithSettings([
          { name: 'web', platform: 'web' },
          { name: 'other', platform: 'web' },
        ]),
      );
      const startObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      await spec.handler({
        action: 'start',
        flowId: 'flow_1',
        arms: { preview: 'other' },
      });

      expect(startObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        settingsName: 'other',
      });
    });

    it('selects the server settings when only the container arm is asked for', async () => {
      const getFlow = jest.fn().mockResolvedValue(
        flowWithSettings([
          { name: 'web', platform: 'web' },
          { name: 'server', platform: 'server' },
        ]),
      );
      const startObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      await spec.handler({
        action: 'start',
        flowId: 'flow_1',
        arms: { container: true },
      });

      expect(startObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        settingsName: 'server',
      });
    });

    it('passes origins, level and replace straight through', async () => {
      const getFlow = jest
        .fn()
        .mockResolvedValue(
          flowWithSettings([{ name: 'web', platform: 'web' }]),
        );
      const startObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      await spec.handler({
        action: 'start',
        flowId: 'flow_1',
        origins: ['https://shop.example.com'],
        level: 'standard',
        replace: true,
      });

      expect(startObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        settingsName: 'web',
        origins: ['https://shop.example.com'],
        level: 'standard',
        replace: true,
      });
    });

    it('names the available settings when the container arm has no server flow', async () => {
      const getFlow = jest
        .fn()
        .mockResolvedValue(
          flowWithSettings([{ name: 'web', platform: 'web' }]),
        );
      const startObserveSession = jest.fn();
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({
        action: 'start',
        flowId: 'flow_1',
        arms: { container: true },
      });

      expect(errorOf(result)).toContain('no server settings');
      expect(startObserveSession).not.toHaveBeenCalled();
    });

    it('asks for an explicit preview arm when several web settings exist', async () => {
      const getFlow = jest.fn().mockResolvedValue(
        flowWithSettings([
          { name: 'web', platform: 'web' },
          { name: 'other', platform: 'web' },
        ]),
      );
      const startObserveSession = jest.fn();
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({ action: 'start', flowId: 'flow_1' });

      expect(errorOf(result)).toContain('web');
      expect(errorOf(result)).toContain('other');
      expect(startObserveSession).not.toHaveBeenCalled();
    });

    it('names the available settings when the preview arm names one that does not exist', async () => {
      const getFlow = jest.fn().mockResolvedValue(
        flowWithSettings([
          { name: 'web', platform: 'web' },
          { name: 'server', platform: 'server' },
        ]),
      );
      const startObserveSession = jest.fn();
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({
        action: 'start',
        flowId: 'flow_1',
        arms: { preview: 'wbe' },
      });

      const message = errorOf(result);
      expect(message).toContain('no settings named "wbe"');
      expect(message).toContain('web (web)');
      expect(message).toContain('server (server)');
      expect(startObserveSession).not.toHaveBeenCalled();
    });

    it('carries the verb ladder in its next-hints', async () => {
      const getFlow = jest
        .fn()
        .mockResolvedValue(
          flowWithSettings([{ name: 'web', platform: 'web' }]),
        );
      const startObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({
          getFlow,
          startObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({ action: 'start', flowId: 'flow_1' });

      expect(hintsOf(result)).toEqual([
        'Simulate before preview: flow_simulate checks mapping with no browser.',
        'Preview streams into this session: mint a link with flow_manage preview_regrant, then open it on your site.',
        'Read with observe_journeys (flowId); it is the only read.',
      ]);
    });
  });

  describe('status: arm presence, records and expiry', () => {
    it('maps both arms from the response shape', async () => {
      const getObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({ getObserveSession, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({
        action: 'status',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });

      expect(getObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });
      expect((result as Structured).structuredContent).toMatchObject({
        sessionId: 'ses_1',
        status: 'live',
        recordsReceived: 7,
        expiresAt: '2026-07-18T01:00:00.000Z',
        arms: {
          preview: {
            attached: true,
            settingsName: 'web',
            activationUrl: ACTIVATION_URL,
            previewEnabled: true,
          },
          container: {
            attached: true,
            settingsName: 'server',
            endpoint: 'https://container.example.com',
          },
        },
      });
    });

    it('reports a detached arm when its part is absent', async () => {
      const getObserveSession = jest
        .fn()
        .mockResolvedValue(
          sessionResult({ server: null, serverFlowName: null }),
        );
      const spec = createObserveSessionToolSpec(
        stubClient({ getObserveSession, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({
        action: 'status',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });

      expect((result as Structured).structuredContent).toMatchObject({
        arms: {
          preview: { attached: true },
          container: { attached: false, settingsName: null, endpoint: null },
        },
      });
    });

    it('surfaces activationUrl with its elbObserve companion, but no standalone credential and no container env', async () => {
      const getObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({ getObserveSession, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({
        action: 'status',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });

      const structured = (result as Structured).structuredContent;
      const text = (result as Structured).content[0].text;

      // activationUrl is surfaced whole: it is the artifact a user opens, and
      // the feed credential travels inside it as the elbObserve companion.
      expect(structured).toMatchObject({
        arms: { preview: { activationUrl: ACTIVATION_URL } },
      });
      expect(text).toContain(`elbObserve=${FEED_CREDENTIAL}`);

      // The credential is never lifted out into a field of its own, and the
      // raw response parts it came from are not passed through.
      expect(text).not.toContain('"credential"');
      expect(structured).not.toHaveProperty('web');
      expect(structured).not.toHaveProperty('server');

      // The container env, and the ingest token in it, never leaves the app.
      expect(text).not.toContain('tok_supersecret');
      expect(text).not.toContain('WALKEROS_INGEST_TOKEN');
      expect(text).not.toContain('WALKEROS_OBSERVER_URL');
      expect(text).not.toContain('"env"');
    });

    it('resolves the flow live window when no sessionId is given', async () => {
      const listJourneys = jest.fn().mockResolvedValue(journeys('ses_live'));
      const getObserveSession = jest
        .fn()
        .mockResolvedValue(sessionResult({ id: 'ses_live' }));
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys,
          getObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      await spec.handler({ action: 'status', flowId: 'flow_1' });

      expect(getObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        sessionId: 'ses_live',
      });
    });

    it('returns the no-session result without a status read', async () => {
      const listJourneys = jest.fn().mockResolvedValue(journeys(null));
      const getObserveSession = jest.fn();
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys,
          getObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({ action: 'status', flowId: 'flow_1' });

      expect(getObserveSession).not.toHaveBeenCalled();
      expect((result as Structured).structuredContent).toMatchObject({
        sessionId: null,
      });
    });

    it('points at observe_journeys and at stop', async () => {
      const getObserveSession = jest.fn().mockResolvedValue(sessionResult());
      const spec = createObserveSessionToolSpec(
        stubClient({ getObserveSession, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({
        action: 'status',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });

      expect(hintsOf(result)).toEqual([
        'Read with observe_journeys (flowId); it is the only read.',
        'End both arms with observe_session stop.',
      ]);
    });

    it('flags an empty feed when nothing has arrived yet', async () => {
      const getObserveSession = jest
        .fn()
        .mockResolvedValue(sessionResult({ recordsReceived: 0 }));
      const spec = createObserveSessionToolSpec(
        stubClient({ getObserveSession, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({
        action: 'status',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });

      expect(hintsOf(result)[0]).toBe(
        'recordsReceived is 0: nothing has reached the feed yet. Drive traffic on an attached arm.',
      );
    });
  });

  describe('stop: ends the whole session', () => {
    it('ends the resolved session and reports both arms detached', async () => {
      const listJourneys = jest.fn().mockResolvedValue(journeys('ses_live'));
      const endObserveSession = jest.fn().mockResolvedValue(undefined);
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys,
          endObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({ action: 'stop', flowId: 'flow_1' });

      expect(endObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        sessionId: 'ses_live',
      });
      expect((result as Structured).structuredContent).toMatchObject({
        sessionId: 'ses_live',
        ended: true,
      });
      expect(hintsOf(result)).toEqual([
        'Session ended and both arms detached. Start a new one with observe_session start.',
      ]);
    });

    it('is a clean no-op when the flow has no live window', async () => {
      const listJourneys = jest.fn().mockResolvedValue(journeys(null));
      const endObserveSession = jest.fn();
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys,
          endObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({ action: 'stop', flowId: 'flow_1' });

      expect(endObserveSession).not.toHaveBeenCalled();
      expect((result as Structured).structuredContent).toMatchObject({
        sessionId: null,
        ended: false,
      });
    });
  });

  describe('an unavailable resolver does not take status and stop down with it', () => {
    // The journeys read that identifies the flow's session needs the observer;
    // the session endpoints do not. A failing lookup must therefore name the
    // fallback rather than read as "this flow has no session".
    const observerDown = () =>
      jest
        .fn()
        .mockRejectedValue(
          new Error('Observer unavailable (OBSERVER_UNAVAILABLE)'),
        );

    /**
     * A failure carrying its code as a FIELD and not in its message, the shape
     * the API client throws. Built locally so the assertion below needs no
     * module mock, and worded so the code cannot leak into the payload through
     * the message: only carrying the field can make the assertion pass.
     */
    class CodedFailure extends Error {
      constructor(
        message: string,
        readonly code: string,
      ) {
        super(message);
        this.name = 'CodedFailure';
      }
    }

    it('keeps the underlying code as a field, not just as prose', async () => {
      // The wrapper reports the recovery instruction, but it must not flatten a
      // coded failure into text: `mcpError` builds the machine-readable part of
      // its payload from `code` on the error it is handed, so a bare re-throw
      // would leave callers string-matching the message.
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys: jest
            .fn()
            .mockRejectedValue(
              new CodedFailure('Observer unavailable', 'OBSERVER_UNAVAILABLE'),
            ),
          endObserveSession: jest.fn(),
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({ action: 'stop', flowId: 'flow_1' });
      const structured = (result as Structured).structuredContent;

      expect((result as Structured).isError).toBe(true);
      expect(structured.code).toBe('OBSERVER_UNAVAILABLE');
      expect(structured.error).toContain('Pass sessionId explicitly');
    });

    it('tells stop to pass sessionId instead of failing opaquely', async () => {
      const endObserveSession = jest.fn();
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys: observerDown(),
          endObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const message = errorOf(
        await spec.handler({ action: 'stop', flowId: 'flow_1' }),
      );

      expect(message).toContain('Pass sessionId explicitly');
      expect(message).toContain('OBSERVER_UNAVAILABLE');
      expect(endObserveSession).not.toHaveBeenCalled();
    });

    it('stops the session anyway when sessionId is passed explicitly', async () => {
      const listJourneys = observerDown();
      const endObserveSession = jest.fn().mockResolvedValue(undefined);
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys,
          endObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const result = await spec.handler({
        action: 'stop',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });

      expect(listJourneys).not.toHaveBeenCalled();
      expect(endObserveSession).toHaveBeenCalledWith({
        projectId: 'proj_1',
        flowId: 'flow_1',
        sessionId: 'ses_1',
      });
      expect((result as Structured).structuredContent).toMatchObject({
        ended: true,
      });
    });

    it('tells status the same thing', async () => {
      const getObserveSession = jest.fn();
      const spec = createObserveSessionToolSpec(
        stubClient({
          listJourneys: observerDown(),
          getObserveSession,
          getDefaultProject: () => 'proj_1',
        }),
      );

      const message = errorOf(
        await spec.handler({ action: 'status', flowId: 'flow_1' }),
      );

      expect(message).toContain('Pass sessionId explicitly');
      expect(getObserveSession).not.toHaveBeenCalled();
    });
  });

  describe('client capability guards', () => {
    it('errors when the client cannot start sessions', async () => {
      const getFlow = jest
        .fn()
        .mockResolvedValue(
          flowWithSettings([{ name: 'web', platform: 'web' }]),
        );
      const spec = createObserveSessionToolSpec(
        stubClient({ getFlow, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({ action: 'start', flowId: 'flow_1' });

      expect(errorOf(result)).toContain('not supported by this client');
    });

    it('reports an unsupported stop before making any network call', async () => {
      const listJourneys = jest.fn().mockResolvedValue(journeys('ses_live'));
      const spec = createObserveSessionToolSpec(
        stubClient({ listJourneys, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({ action: 'stop', flowId: 'flow_1' });

      expect(errorOf(result)).toContain('not supported by this client');
      expect(listJourneys).not.toHaveBeenCalled();
    });

    it('reports an unsupported status before making any network call', async () => {
      const listJourneys = jest.fn().mockResolvedValue(journeys('ses_live'));
      const spec = createObserveSessionToolSpec(
        stubClient({ listJourneys, getDefaultProject: () => 'proj_1' }),
      );

      const result = await spec.handler({ action: 'status', flowId: 'flow_1' });

      expect(errorOf(result)).toContain('not supported by this client');
      expect(listJourneys).not.toHaveBeenCalled();
    });
  });
});

describe('preview_regrant auto-pairs with the flow live window', () => {
  it('threads the resolved sessionId when none is given', async () => {
    const regrantPreview = jest.fn().mockResolvedValue({
      previewId: 'prv_1',
      activationUrl: 'https://shop.example.com?elbPreview=gr_x',
    });
    const listJourneys = jest.fn().mockResolvedValue(journeys('ses_live'));
    const spec = createFlowManageToolSpec(
      stubClient({
        regrantPreview,
        listJourneys,
        getDefaultProject: () => 'proj_1',
      }),
    );

    await spec.handler({
      action: 'preview_regrant',
      flowId: 'flow_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
    });

    expect(regrantPreview).toHaveBeenCalledWith({
      projectId: 'proj_1',
      flowId: 'flow_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
      sessionId: 'ses_live',
    });
  });

  it('resolves the window under the same project the regrant is sent to', async () => {
    // This path degrades silently on a miss, so a project mismatch would never
    // surface: it would quietly pair against another project's window or drop
    // the pairing altogether.
    const regrantPreview = jest.fn().mockResolvedValue({
      previewId: 'prv_1',
      activationUrl: 'https://shop.example.com?elbPreview=gr_x',
    });
    const listJourneys = jest.fn().mockResolvedValue(journeys('ses_live'));
    const spec = createFlowManageToolSpec(
      stubClient({
        regrantPreview,
        listJourneys,
        getDefaultProject: () => 'proj_default',
      }),
    );

    await spec.handler({
      action: 'preview_regrant',
      flowId: 'flow_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
    });

    expect(listJourneys).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj_default' }),
    );
    expect(regrantPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj_default',
        sessionId: 'ses_live',
      }),
    );
  });

  it('keeps an explicit sessionId as the override', async () => {
    const regrantPreview = jest.fn().mockResolvedValue({
      previewId: 'prv_1',
      activationUrl: 'https://shop.example.com?elbPreview=gr_x',
    });
    const listJourneys = jest.fn().mockResolvedValue(journeys('ses_live'));
    const spec = createFlowManageToolSpec(
      stubClient({
        regrantPreview,
        listJourneys,
        getDefaultProject: () => 'proj_1',
      }),
    );

    await spec.handler({
      action: 'preview_regrant',
      flowId: 'flow_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
      sessionId: 'ses_explicit',
    });

    expect(regrantPreview).toHaveBeenCalledWith({
      projectId: 'proj_1',
      flowId: 'flow_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
      sessionId: 'ses_explicit',
    });
    expect(listJourneys).not.toHaveBeenCalled();
  });

  it('regrants a plain web preview when no window resolves', async () => {
    const regrantPreview = jest.fn().mockResolvedValue({
      previewId: 'prv_1',
      activationUrl: 'https://shop.example.com?elbPreview=gr_x',
    });
    const listJourneys = jest.fn().mockResolvedValue(journeys(null));
    const spec = createFlowManageToolSpec(
      stubClient({
        regrantPreview,
        listJourneys,
        getDefaultProject: () => 'proj_1',
      }),
    );

    await spec.handler({
      action: 'preview_regrant',
      flowId: 'flow_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
    });

    expect(regrantPreview).toHaveBeenCalledWith({
      projectId: 'proj_1',
      flowId: 'flow_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
    });
  });
});
