import type { WalkerOS } from '@elbwalker/types';
import type { Config, CustomEvent, Destination } from '../types';
import { createEvent } from '@elbwalker/utils';

describe('Node Destination Google Ads API', () => {
  let destination: Destination;
  let event: WalkerOS.Event;
  let config: Config;
  let mockFn: jest.Mock;

  beforeEach(async () => {
    mockFn = jest.fn();
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;

    event = createEvent();
  });

  afterEach(() => {});

  async function getConfig(custom = {}) {
    return (await destination.init({ custom })) as Config;
  }

  test('init', async () => {
    expect(true).toBe(true);
  });

  test('push', async () => {
    const config = await getConfig();
    await destination.push(event, config);

    expect(true).toBe(true);
  });
});
