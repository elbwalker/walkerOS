jest.mock('@walkeros/cli', () => ({
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  setDefaultProject: jest.fn(),
  getDefaultProject: jest.fn(),
  listAllFlows: jest.fn(),
  listFlows: jest.fn(),
  getFlow: jest.fn(),
  createFlow: jest.fn(),
  updateFlow: jest.fn(),
  deleteFlow: jest.fn(),
  duplicateFlow: jest.fn(),
  listPreviews: jest.fn(),
  getPreview: jest.fn(),
  createPreview: jest.fn(),
  deletePreview: jest.fn(),
  regrantPreview: jest.fn(),
  listSecrets: jest.fn(),
  createSecret: jest.fn(),
  updateSecret: jest.fn(),
  deleteSecret: jest.fn(),
  deploy: jest.fn(),
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  deleteDeployment: jest.fn(),
  listJourneys: jest.fn(),
  startObserveSession: jest.fn(),
  getObserveSession: jest.fn(),
  endObserveSession: jest.fn(),
  requestDeviceCode: jest.fn(),
  pollForToken: jest.fn(),
  whoami: jest.fn(),
  resolveToken: jest.fn(),
  resolveAppUrl: jest.fn(),
  deleteConfig: jest.fn(),
  feedback: jest.fn(),
  getFeedbackPreference: jest.fn(),
  setFeedbackPreference: jest.fn(),
}));

import * as cli from '@walkeros/cli';
import { HttpToolClient } from '../http-tool-client.js';
import type { ObserveSessionResult } from '../tool-client.js';

const observeSession: ObserveSessionResult = {
  id: 'ses_1',
  projectId: 'proj_1',
  flowId: 'fl_1',
  status: 'live',
  errorMessage: null,
  observedFlowName: 'web',
  serverFlowName: 'server',
  web: {
    activationUrl: 'https://shop.example/?elbObserve=obsw_pb1.ses_1.tok',
    credential: 'obsw_pb1.ses_1.tok',
    previewEnabled: true,
    bundleUrl: 'https://cdn.test/preview/proj_1/walker.abcd1234.js',
  },
  server: {
    endpoint: 'https://obs-ses-1.containers.test',
    env: {
      WALKEROS_OBSERVER_URL: 'https://observer.test',
      WALKEROS_DEPLOYMENT_ID: 'ses_1',
      WALKEROS_INGEST_TOKEN: 'srv_ingest_tok',
    },
  },
  expiresAt: '2026-07-21T00:00:00.000Z',
  recordsReceived: 7,
  createdAt: '2026-07-20T00:00:00.000Z',
};

describe('HttpToolClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates listProjects to @walkeros/cli', async () => {
    (cli.listProjects as jest.Mock).mockResolvedValue({ projects: [] });
    const client = new HttpToolClient();
    const result = await client.listProjects();
    expect(cli.listProjects).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ projects: [] });
  });

  it('forwards pagination options to cli.listProjects', async () => {
    (cli.listProjects as jest.Mock).mockResolvedValue({ projects: [] });
    const client = new HttpToolClient();
    await client.listProjects({ cursor: 'abc', limit: 10 });
    expect(cli.listProjects).toHaveBeenCalledWith({ cursor: 'abc', limit: 10 });
  });

  it('delegates listJourneys to cli.listJourneys with the flow options', async () => {
    (cli.listJourneys as jest.Mock).mockResolvedValue({
      sessionId: 'ses_1',
      flowId: 'flow_1',
      assembledAt: '2026-07-06T00:00:00.000Z',
      journeys: [],
      gaps: [],
    });
    const client = new HttpToolClient();
    const result = await client.listJourneys({
      flowId: 'flow_1',
      projectId: 'proj_1',
      traceId: 'T1',
      limit: 10,
    });
    expect(cli.listJourneys).toHaveBeenCalledWith({
      flowId: 'flow_1',
      projectId: 'proj_1',
      traceId: 'T1',
      limit: 10,
    });
    expect(result.sessionId).toBe('ses_1');
  });

  it('provides the observe session lifecycle trio, so the local plane is never degraded', () => {
    const client = new HttpToolClient();
    expect(typeof client.startObserveSession).toBe('function');
    expect(typeof client.getObserveSession).toBe('function');
    expect(typeof client.endObserveSession).toBe('function');
  });

  it('delegates startObserveSession with settingsName, origins, level, and replace', async () => {
    (cli.startObserveSession as jest.Mock).mockResolvedValue(observeSession);
    const client = new HttpToolClient();
    const result = await client.startObserveSession({
      projectId: 'proj_1',
      flowId: 'fl_1',
      settingsName: 'web',
      origins: ['https://shop.example'],
      level: 'trace',
      replace: true,
    });
    expect(cli.startObserveSession).toHaveBeenCalledWith({
      projectId: 'proj_1',
      flowId: 'fl_1',
      settingsName: 'web',
      origins: ['https://shop.example'],
      level: 'trace',
      replace: true,
    });
    expect(result.id).toBe('ses_1');
  });

  it('delegates getObserveSession with the session ref', async () => {
    (cli.getObserveSession as jest.Mock).mockResolvedValue(observeSession);
    const client = new HttpToolClient();
    const result = await client.getObserveSession({
      projectId: 'proj_1',
      flowId: 'fl_1',
      sessionId: 'ses_1',
    });
    expect(cli.getObserveSession).toHaveBeenCalledWith({
      projectId: 'proj_1',
      flowId: 'fl_1',
      sessionId: 'ses_1',
    });
    expect(result.recordsReceived).toBe(7);
  });

  it('delegates endObserveSession with the session ref', async () => {
    (cli.endObserveSession as jest.Mock).mockResolvedValue(undefined);
    const client = new HttpToolClient();
    await client.endObserveSession({
      projectId: 'proj_1',
      flowId: 'fl_1',
      sessionId: 'ses_1',
    });
    expect(cli.endObserveSession).toHaveBeenCalledWith({
      projectId: 'proj_1',
      flowId: 'fl_1',
      sessionId: 'ses_1',
    });
  });

  it('delegates regrantPreview to cli.regrantPreview with ids, origins, and sessionId', async () => {
    (cli.regrantPreview as jest.Mock).mockResolvedValue({
      grant: 'gr_x',
      activationUrl: 'https://shop.example.com?elbPreview=gr_x',
      sessionExpiresAt: '2026-04-21T01:00:00Z',
    });
    const client = new HttpToolClient();
    const result = (await client.regrantPreview({
      projectId: 'proj_1',
      flowId: 'fl_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
      sessionId: 'ses_1',
    })) as { activationUrl: string };
    expect(cli.regrantPreview).toHaveBeenCalledWith({
      projectId: 'proj_1',
      flowId: 'fl_1',
      previewId: 'prv_1',
      origins: ['https://shop.example.com'],
      sessionId: 'ses_1',
    });
    expect(result.activationUrl).toBe(
      'https://shop.example.com?elbPreview=gr_x',
    );
  });

  it('createPreview bridges siteUrl to the CLI url option', async () => {
    (cli.createPreview as jest.Mock).mockResolvedValue({ id: 'prv_1' });
    const client = new HttpToolClient();
    await client.createPreview({
      projectId: 'proj_1',
      flowId: 'fl_1',
      flowSettingsId: 'fs_1',
      siteUrl: 'https://my-site.com',
    });
    expect(cli.createPreview).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://my-site.com' }),
    );
  });

  it('createPreview keeps an explicit url over siteUrl', async () => {
    (cli.createPreview as jest.Mock).mockResolvedValue({ id: 'prv_1' });
    const client = new HttpToolClient();
    await client.createPreview({
      projectId: 'proj_1',
      flowId: 'fl_1',
      flowSettingsId: 'fs_1',
      url: 'https://explicit.example',
      siteUrl: 'https://other.example',
    });
    expect(cli.createPreview).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://explicit.example' }),
    );
  });

  it('delegates submitFeedback to cli.feedback', async () => {
    (cli.feedback as jest.Mock).mockResolvedValue(undefined);
    const client = new HttpToolClient();
    await client.submitFeedback('hello', { anonymous: true });
    expect(cli.feedback).toHaveBeenCalledWith('hello', { anonymous: true });
  });

  it('checkHealth returns reachable true with NO token set (tokenless probe)', async () => {
    // resolveToken returns null → logged out; checkHealth must not require auth.
    (cli.resolveToken as jest.Mock).mockReturnValue(null);
    (cli.resolveAppUrl as jest.Mock).mockReturnValue('https://app.test');
    const mockFetch = jest
      .fn()
      .mockResolvedValue({ json: async () => ({ status: 'ok' }) });
    global.fetch = mockFetch;

    const client = new HttpToolClient();
    const result = await client.checkHealth();

    expect(result.reachable).toBe(true);
    expect(result.status).toBe('ok');
    // Probes the public /api/health route with a plain fetch (no Authorization).
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://app.test/api/health');
    expect(init.headers).toBeUndefined();
  });

  it('checkHealth returns reachable false on a network/timeout failure', async () => {
    (cli.resolveAppUrl as jest.Mock).mockReturnValue('https://app.test');
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const client = new HttpToolClient();
    const result = await client.checkHealth();
    expect(result.reachable).toBe(false);
  });

  it('delegates sync config helpers without awaiting', () => {
    (cli.resolveToken as jest.Mock).mockReturnValue({
      token: 'tok_abc',
      source: 'env',
    });
    (cli.deleteConfig as jest.Mock).mockReturnValue(true);
    (cli.getDefaultProject as jest.Mock).mockReturnValue('proj_1');
    const client = new HttpToolClient();
    expect(client.resolveToken()).toEqual({ token: 'tok_abc', source: 'env' });
    expect(client.deleteConfig()).toBe(true);
    expect(client.getDefaultProject()).toBe('proj_1');
  });
});
