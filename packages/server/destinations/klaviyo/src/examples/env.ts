import type {
  Env,
  KlaviyoEventsApiMock,
  KlaviyoProfilesApiMock,
} from '../types';

const asyncNoop = () => Promise.resolve({});

function createMockEventsApi(): KlaviyoEventsApiMock {
  return {
    createEvent: asyncNoop,
  };
}

function createMockProfilesApi(): KlaviyoProfilesApiMock {
  return {
    createOrUpdateProfile: asyncNoop,
  };
}

export const push: Env = {
  eventsApi: createMockEventsApi(),
  profilesApi: createMockProfilesApi(),
};

export const simulation = [
  'call:eventsApi.createEvent',
  'call:profilesApi.createOrUpdateProfile',
];
