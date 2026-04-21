import type {
  Destination,
  Settings,
  CustomerIoTrackClientMock,
  CustomerIoApiClientMock,
} from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationCustomerIo from './types';

export const destinationCustomerIo: Destination = {
  type: 'customerio',

  config: {},

  init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;

    // Use env mocks if provided (testing), otherwise create real SDK clients
    const envTyped = env as
      | {
          trackClient?: CustomerIoTrackClientMock;
          apiClient?: CustomerIoApiClientMock;
        }
      | undefined;

    if (!envTyped?.trackClient) {
      // Production path: create real TrackClient
      try {
        // Use dynamic require to allow tests to mock via jest.mock('customerio-node').
        const customerioSdk = require('customerio-node');
        const { TrackClient, RegionUS, RegionEU } = customerioSdk;
        const region = settings.region === 'eu' ? RegionEU : RegionUS;
        const trackClient = new TrackClient(settings.siteId, settings.apiKey, {
          region,
          ...(settings.timeout ? { timeout: settings.timeout } : {}),
        });
        settings._trackClient = trackClient as CustomerIoTrackClientMock;
      } catch (err) {
        logger.throw(`Failed to initialize Customer.io TrackClient: ${err}`);
      }
    }

    if (!envTyped?.apiClient && settings.appApiKey) {
      // Production path: create real APIClient for transactional messaging
      try {
        const customerioSdk = require('customerio-node');
        const { APIClient, RegionUS, RegionEU } = customerioSdk;
        const region = settings.region === 'eu' ? RegionEU : RegionUS;
        const apiClient = new APIClient(settings.appApiKey, {
          region,
          ...(settings.timeout ? { timeout: settings.timeout } : {}),
        });
        settings._apiClient = apiClient as CustomerIoApiClientMock;
      } catch (err) {
        logger.throw(`Failed to initialize Customer.io APIClient: ${err}`);
      }
    }

    settings._state = {};

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const settings = (config?.settings || {}) as Settings;
    // TrackClient has no flush -- just clear references
    settings._trackClient = undefined;
    settings._apiClient = undefined;
  },
};

export default destinationCustomerIo;
