import type { Env, HubSpotClientMock } from '../types';

const asyncNoop = () => Promise.resolve();

function createMockClient(): HubSpotClientMock {
  return {
    events: {
      send: {
        basicApi: { send: asyncNoop },
        batchApi: { send: asyncNoop },
      },
    },
    crm: {
      contacts: {
        basicApi: { update: asyncNoop },
      },
    },
  };
}

export const push: Env = {
  client: createMockClient(),
};

export const simulation = [
  'call:client.events.send.basicApi.send',
  'call:client.events.send.batchApi.send',
  'call:client.crm.contacts.basicApi.update',
];
