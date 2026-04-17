import type {
  Destination,
  Settings,
  KlaviyoEventsApiMock,
  KlaviyoProfilesApiMock,
} from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationKlaviyo from './types';

export const destinationKlaviyo: Destination = {
  type: 'klaviyo',

  config: {},

  init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;

    // Use env mocks if provided (testing), otherwise create real SDK instances
    const envTyped = env as
      | {
          eventsApi?: KlaviyoEventsApiMock;
          profilesApi?: KlaviyoProfilesApiMock;
        }
      | undefined;

    if (!envTyped?.eventsApi || !envTyped?.profilesApi) {
      // Production path: create real API instances
      try {
        // Use dynamic require to avoid bundling the SDK when not needed
        // and to allow tests to mock via jest.mock('klaviyo-api').
        const klaviyoApi = require('klaviyo-api');
        const { ApiKeySession, EventsApi, ProfilesApi } = klaviyoApi;
        const session = new ApiKeySession(settings.apiKey);
        settings._eventsApi = new EventsApi(session) as KlaviyoEventsApiMock;
        settings._profilesApi = new ProfilesApi(
          session,
        ) as KlaviyoProfilesApiMock;
      } catch (err) {
        logger.throw(`Failed to initialize Klaviyo SDK: ${err}`);
      }
    }

    settings._state = {};

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationKlaviyo;
