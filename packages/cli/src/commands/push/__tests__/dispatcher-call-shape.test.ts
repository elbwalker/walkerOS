import { runPushCommand } from '../run';

jest.mock('../index', () => {
  const actual = jest.requireActual('../index');
  return {
    ...actual,
    push: jest.fn(),
    simulateDestination: jest.fn(),
    simulateSource: jest.fn(),
    simulateTransformer: jest.fn(),
  };
});

import * as routes from '../index';

const mockedRoutes = jest.mocked(routes);

beforeEach(() => {
  mockedRoutes.simulateDestination.mockReset().mockResolvedValue({
    success: true,
    duration: 0,
  });
  mockedRoutes.simulateSource.mockReset().mockResolvedValue({
    success: true,
    duration: 0,
  });
  mockedRoutes.simulateTransformer.mockReset().mockResolvedValue({
    success: true,
    duration: 0,
  });
  mockedRoutes.push.mockReset().mockResolvedValue({
    success: true,
    duration: 0,
  });
});

const baseOptions = {
  config: '/tmp/non-existent-flow.json',
  event:
    '{"name":"product view","entity":"product","action":"view","data":{"id":"sku-1"}}',
  flow: 'web',
  silent: true,
  verbose: false,
  json: false,
  mock: [] as string[],
  simulate: [] as string[],
};

describe('runPushCommand dispatcher call shape', () => {
  it('routes to push() when no --simulate flags', async () => {
    await runPushCommand({ ...baseOptions });
    expect(mockedRoutes.push).toHaveBeenCalledTimes(1);
    expect(mockedRoutes.simulateDestination).not.toHaveBeenCalled();
    expect(mockedRoutes.simulateSource).not.toHaveBeenCalled();
    expect(mockedRoutes.simulateTransformer).not.toHaveBeenCalled();
  });

  it('calls simulateDestination ONCE PER id (multi-target loop)', async () => {
    await runPushCommand({
      ...baseOptions,
      simulate: ['destination.api', 'destination.meta'],
    });
    expect(mockedRoutes.simulateDestination).toHaveBeenCalledTimes(2);
    const ids = mockedRoutes.simulateDestination.mock.calls
      .map((c) => (c[2] as { destinationId: string }).destinationId)
      .sort();
    expect(ids).toEqual(['api', 'meta']);
    expect(mockedRoutes.push).not.toHaveBeenCalled();
  });

  it('calls simulateSource once with the single id', async () => {
    await runPushCommand({
      ...baseOptions,
      simulate: ['source.browser'],
    });
    expect(mockedRoutes.simulateSource).toHaveBeenCalledTimes(1);
    const arg = mockedRoutes.simulateSource.mock.calls[0][2] as {
      sourceId: string;
    };
    expect(arg.sourceId).toBe('browser');
    expect(mockedRoutes.push).not.toHaveBeenCalled();
  });

  it('errors on invalid format and DOES NOT call any route', async () => {
    const result = await runPushCommand({
      ...baseOptions,
      simulate: ['api'],
    });
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/Invalid step format/);
    expect(mockedRoutes.push).not.toHaveBeenCalled();
    expect(mockedRoutes.simulateDestination).not.toHaveBeenCalled();
    expect(mockedRoutes.simulateSource).not.toHaveBeenCalled();
    expect(mockedRoutes.simulateTransformer).not.toHaveBeenCalled();
  });

  it('errors on multi-source and DOES NOT call simulateSource', async () => {
    const result = await runPushCommand({
      ...baseOptions,
      simulate: ['source.browser', 'source.dataLayer'],
    });
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/source.*single target/i);
    expect(mockedRoutes.simulateSource).not.toHaveBeenCalled();
  });
});
