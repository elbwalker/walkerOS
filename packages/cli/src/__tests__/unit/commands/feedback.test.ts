import { feedback } from '../../../commands/feedback/index.js';

jest.mock('../../../lib/config-file.js', () => ({
  readConfig: jest.fn(),
}));

jest.mock('../../../core/http.js', () => ({
  publicFetch: jest.fn().mockResolvedValue({ ok: true }),
}));

import { readConfig } from '../../../lib/config-file.js';
import { publicFetch } from '../../../core/http.js';

const mockReadConfig = readConfig as jest.Mock;
const mockPublicFetch = publicFetch as jest.Mock;

describe('feedback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockPublicFetch.mockResolvedValue({ ok: true });
    mockReadConfig.mockReturnValue(null);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('sends anonymous feedback when no config exists', async () => {
    await feedback('Great tool!');

    expect(mockPublicFetch).toHaveBeenCalledWith('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Great tool!' }),
    });
  });

  it('sends anonymous feedback when config has anonymousFeedback=true', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'user@example.com',
      appUrl: '',
      anonymousFeedback: true,
    });

    await feedback('Nice!');

    const body = JSON.parse(mockPublicFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: 'Nice!' });
    expect(body.userId).toBeUndefined();
    expect(body.projectId).toBeUndefined();
  });

  it('includes userId and projectId when not anonymous', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'user@example.com',
      appUrl: '',
      anonymousFeedback: false,
    });
    process.env.WALKEROS_PROJECT_ID = 'proj_123';

    await feedback('Bug report');

    const body = JSON.parse(mockPublicFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      text: 'Bug report',
      userId: 'user@example.com',
      projectId: 'proj_123',
    });
  });

  it('options.anonymous overrides config', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'user@example.com',
      appUrl: '',
      anonymousFeedback: false, // config says non-anonymous
    });

    await feedback('Force anon', { anonymous: true });

    const body = JSON.parse(mockPublicFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: 'Force anon' });
    expect(body.userId).toBeUndefined();
  });

  it('defaults to anonymous when config has no anonymousFeedback field', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'user@example.com',
      appUrl: '',
    });

    await feedback('Default anon');

    const body = JSON.parse(mockPublicFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: 'Default anon' });
    expect(body.userId).toBeUndefined();
  });

  it('sends to the correct path', async () => {
    await feedback('Test');

    expect(mockPublicFetch).toHaveBeenCalledWith(
      '/api/feedback',
      expect.any(Object),
    );
  });

  it('throws on non-ok response', async () => {
    mockPublicFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(feedback('fail')).rejects.toThrow(
      'Feedback submission failed: 500 Internal Server Error',
    );
  });

  it('omits projectId when env var is not set and not anonymous', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'user@example.com',
      appUrl: '',
      anonymousFeedback: false,
    });
    delete process.env.WALKEROS_PROJECT_ID;

    await feedback('No project');

    const body = JSON.parse(mockPublicFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      text: 'No project',
      userId: 'user@example.com',
    });
    expect(body.projectId).toBeUndefined();
  });
});
