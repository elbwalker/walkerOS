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
  'call:events.send.basicApi.send',
  'call:events.send.batchApi.send',
  'call:crm.contacts.basicApi.update',
];
