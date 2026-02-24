import { createApiClient } from '../../core/api-client.js';

export interface MockApiClient {
  GET: jest.Mock;
  POST: jest.Mock;
  PATCH: jest.Mock;
  DELETE: jest.Mock;
}

/**
 * Sets up mock return value for createApiClient.
 * IMPORTANT: The test file must still declare jest.mock('../../../core/api-client.js')
 * at the top level (Jest only hoists jest.mock calls within the test file itself).
 */
export function setupMockApiClient(): MockApiClient {
  const client: MockApiClient = {
    GET: jest.fn(),
    POST: jest.fn(),
    PATCH: jest.fn(),
    DELETE: jest.fn(),
  };

  (createApiClient as jest.Mock).mockReturnValue(client);

  return client;
}
