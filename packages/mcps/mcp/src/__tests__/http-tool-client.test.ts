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
  deploy: jest.fn(),
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  deleteDeployment: jest.fn(),
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
