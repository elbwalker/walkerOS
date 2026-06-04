import { runPushCommand } from '../run';

jest.mock('../index', () => {
  const actual = jest.requireActual('../index');
  return {
    ...actual,
    push: jest.fn(),
    simulateDestination: jest.fn(),
    simulateSource: jest.fn(),
    simulateTransformer: jest.fn(),
    simulateCollector: jest.fn(),
  };
});

import * as routes from '../index';

const mockedRoutes = jest.mocked(routes);

beforeEach(() => {
  mockedRoutes.simulateTransformer.mockReset().mockResolvedValue({
    step: 'transformer',
    name: 'mock',
    events: [],
    calls: [],
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

describe('runPushCommand transformer ingest forwarding', () => {
  it('forwards options.ingest into simulateTransformer', async () => {
    await runPushCommand({
      ...baseOptions,
      simulate: ['transformer.decoder'],
      ingest: { url: 'https://example.com/collect?v=2' },
    });

    expect(mockedRoutes.simulateTransformer).toHaveBeenCalledTimes(1);
    expect(mockedRoutes.simulateTransformer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        transformerId: 'decoder',
        ingest: { url: 'https://example.com/collect?v=2' },
      }),
    );
  });
});
