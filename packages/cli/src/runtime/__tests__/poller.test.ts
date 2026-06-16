import { createPoller } from '../poller.js';
import { fetchConfig, type ConfigFetchResult } from '../config-fetcher.js';
import type { Logger } from '@walkeros/core';

jest.mock('../config-fetcher.js');

const mockedFetchConfig = jest.mocked(fetchConfig);

function makeTypedLogger(): Logger.Instance {
  const logger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: (message: string | Error): never => {
      throw new Error(typeof message === 'string' ? message : message.message);
    },
    json: jest.fn(),
    scope: (_name: string): Logger.Instance => logger,
  };
  return logger;
}

const baseFetchOptions = {
  appUrl: 'http://localhost:3000',
  token: 'sk-walkeros-test',
  projectId: 'proj_1',
  flowId: 'cfg_1',
};

describe('createPoller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('seeds lastEtag from initialEtag so the first poll sends If-None-Match and a 304-equivalent unchanged result skips onUpdate', async () => {
    const logger = makeTypedLogger();
    const onUpdate = jest.fn(async () => {});
    const unchanged: ConfigFetchResult = { changed: false };
    mockedFetchConfig.mockResolvedValue(unchanged);

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30000,
        initialEtag: 'X',
        onUpdate,
      },
      logger,
    );

    await poller.pollOnce();

    expect(mockedFetchConfig).toHaveBeenCalledTimes(1);
    expect(mockedFetchConfig).toHaveBeenCalledWith({
      ...baseFetchOptions,
      lastEtag: 'X',
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('Config unchanged');
  });

  it('sends lastEtag undefined on the first poll when no initialEtag is provided', async () => {
    const logger = makeTypedLogger();
    const onUpdate = jest.fn(async () => {});
    mockedFetchConfig.mockResolvedValue({ changed: false });

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30000,
        onUpdate,
      },
      logger,
    );

    await poller.pollOnce();

    expect(mockedFetchConfig).toHaveBeenCalledWith({
      ...baseFetchOptions,
      lastEtag: undefined,
    });
  });

  it('calls onUpdate and advances lastEtag on a changed result', async () => {
    const logger = makeTypedLogger();
    const onUpdate = jest.fn(async () => {});
    const changed: ConfigFetchResult = {
      changed: true,
      content: { version: 2 },
      version: 'v2',
      etag: '"v2"',
    };
    mockedFetchConfig
      .mockResolvedValueOnce(changed)
      .mockResolvedValueOnce({ changed: false });

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30000,
        initialEtag: 'X',
        onUpdate,
      },
      logger,
    );

    await poller.pollOnce();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ version: 2 }, 'v2');

    // Next poll should carry the advanced etag, not the initial seed.
    await poller.pollOnce();

    expect(mockedFetchConfig).toHaveBeenNthCalledWith(2, {
      ...baseFetchOptions,
      lastEtag: '"v2"',
    });
  });

  it('does NOT reset an advanced etag back to the boot seed across stop/start', async () => {
    const logger = makeTypedLogger();
    const onUpdate = jest.fn(async () => {});
    mockedFetchConfig
      .mockResolvedValueOnce({
        changed: true,
        content: { version: 2 },
        version: 'v2',
        etag: '"v2"',
      })
      .mockResolvedValue({ changed: false });

    const poller = createPoller(
      {
        fetchOptions: baseFetchOptions,
        intervalMs: 30000,
        initialEtag: 'X',
        onUpdate,
      },
      logger,
    );

    await poller.pollOnce();

    poller.start();
    poller.stop();

    await poller.pollOnce();

    // After advancing past the boot seed, a stop/start must not reset
    // lastEtag to the stale 'X' (which would trigger an unnecessary rebundle).
    expect(mockedFetchConfig).toHaveBeenNthCalledWith(2, {
      ...baseFetchOptions,
      lastEtag: '"v2"',
    });
  });
});
