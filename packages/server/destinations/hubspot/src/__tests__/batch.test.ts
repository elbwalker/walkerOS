import { startFlow } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
import { destinationHubspot } from '..';
import type { HubSpotClientMock, HubSpotEventRequest } from '../types';

function clientRecording(batches: HubSpotEventRequest[][]): HubSpotClientMock {
  return {
    events: {
      send: {
        basicApi: { send: () => Promise.resolve() },
        batchApi: {
          send: async ({ inputs }) => {
            batches.push(inputs);
          },
        },
      },
    },
    crm: { contacts: { basicApi: { update: () => Promise.resolve() } } },
  };
}

describe('hubspot config.batch', () => {
  it('sends a flushed batch through the batch API and fails only the entry it cannot send', async () => {
    const batches: HubSpotEventRequest[][] = [];
    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        hubspot: {
          code: destinationHubspot,
          config: {
            settings: { accessToken: 'pat', eventNamePrefix: 'pe1_' },
            batch: { size: 10, wait: 60_000 },
          },
          env: { client: clientRecording(batches) },
        },
      },
    });

    for (const user of [{ email: 'a@x.com' }, {}, { email: 'b@x.com' }])
      await collector.push(createEvent({ name: 'page view', user }));
    const flushed = await collector.command('flush');

    expect(batches).toHaveLength(1);
    expect(batches[0].map(({ email }) => email)).toEqual([
      'a@x.com',
      'b@x.com',
    ]);
    expect(flushed.ok).toBe(false);
    const status = collector.status.destinations.hubspot;
    expect(status.count).toBe(2);
    expect(status.failed).toBe(1);
    expect(collector.destinations.hubspot.dlq).toHaveLength(1);

    await collector.command('shutdown');
  });
});
