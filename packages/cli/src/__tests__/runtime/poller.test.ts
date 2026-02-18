import { createPoller } from '../../runtime/poller.js';

// Mock config-fetcher
jest.mock('../../runtime/config-fetcher.js');
import { fetchConfig } from '../../runtime/config-fetcher.js';
const mockFetchConfig = fetchConfig as jest.MockedFunction<typeof fetchConfig>;

beforeEach(() => {
  mockFetchConfig.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  throw: jest.fn(),
  scope: jest.fn(),
};

const baseFetchOptions = {
  appUrl: 'https://app.example.com',
  token: 'sk-abc',
  projectId: 'proj_1',
  flowId: 'flow_1',
};

describe('createPoller', () => {
  it('calls onUpdate when config changes', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    mockFetchConfig.mockResolvedValueOnce({
      changed: true,
      content: { version: 1, flows: {} },
      version: 'abc123',
      etag: '"abc123"',
    });

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30_000,
        onUpdate,
      },
      mockLogger,
    );

    await poller.pollOnce();
    expect(onUpdate).toHaveBeenCalledWith({ version: 1, flows: {} }, 'abc123');
    poller.stop();
  });

  it('does not call onUpdate when config is unchanged', async () => {
    const onUpdate = jest.fn();
    mockFetchConfig.mockResolvedValueOnce({ changed: false });

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30_000,
        onUpdate,
      },
      mockLogger,
    );

    await poller.pollOnce();
    expect(onUpdate).not.toHaveBeenCalled();
    poller.stop();
  });

  it('does not crash on fetch error', async () => {
    const onUpdate = jest.fn();
    mockFetchConfig.mockRejectedValueOnce(new Error('network down'));

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30_000,
        onUpdate,
      },
      mockLogger,
    );

    await expect(poller.pollOnce()).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    poller.stop();
  });

  it('passes lastEtag on subsequent polls', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    mockFetchConfig
      .mockResolvedValueOnce({
        changed: true,
        content: { version: 1 },
        version: 'v1',
        etag: '"v1"',
      })
      .mockResolvedValueOnce({ changed: false });

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30_000,
        onUpdate,
      },
      mockLogger,
    );

    await poller.pollOnce();
    await poller.pollOnce();

    // Second call should include lastEtag
    expect(mockFetchConfig).toHaveBeenCalledTimes(2);
    expect(mockFetchConfig.mock.calls[1][0]).toEqual(
      expect.objectContaining({ lastEtag: '"v1"' }),
    );
    poller.stop();
  });

  it('stop clears the interval', () => {
    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30_000,
        onUpdate: jest.fn(),
      },
      mockLogger,
    );

    poller.start();
    poller.stop();
    // No errors — interval is cleared
  });
});
