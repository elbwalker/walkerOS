import '../support/version.js';

import { clearCatalogCache } from '../../catalog.js';
import { registerReferenceResources } from '../../resources/references.js';

interface RegisteredResource {
  uri: string;
  config: unknown;
  readCallback: (...args: unknown[]) => Promise<{
    contents: Array<{ uri: string; text: string; mimeType: string }>;
  }>;
}

function createMockServer() {
  const resources: Record<string, RegisteredResource> = {};
  return {
    server: {
      resource(
        name: string,
        uri: string,
        config: unknown,
        readCallback: RegisteredResource['readCallback'],
      ) {
        resources[name] = { uri, config, readCallback };
      },
    },
    getResource(name: string) {
      return resources[name];
    },
  };
}

describe('packages reference resource uses app base url', () => {
  const originalAppUrl = process.env.WALKEROS_APP_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalAppUrl !== undefined) {
      process.env.WALKEROS_APP_URL = originalAppUrl;
    } else {
      delete process.env.WALKEROS_APP_URL;
    }
    global.fetch = originalFetch;
    clearCatalogCache();
  });

  it('fetches the app /api/packages endpoint, not npm', async () => {
    process.env.WALKEROS_APP_URL = 'https://app.example.test';

    const fetchedUrls: string[] = [];
    const fetchMock: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      fetchedUrls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          catalog: [
            {
              name: '@walkeros/web-destination-gtag',
              version: '1.0.0',
              type: 'destination',
              platform: ['web'],
              description: 'GA4',
            },
          ],
        }),
      } as Response;
    };
    global.fetch = fetchMock;

    const { server, getResource } = createMockServer();
    registerReferenceResources(server as never);

    const resource = getResource('packages');
    expect(resource).toBeDefined();

    const result = await resource.readCallback();
    const parsed = JSON.parse(result.contents[0].text) as Array<{
      name: string;
    }>;
    expect(parsed[0].name).toBe('@walkeros/web-destination-gtag');

    // The app catalog endpoint was hit; npm registry was not.
    expect(fetchedUrls.some((u) => u.includes('/api/packages'))).toBe(true);
    expect(fetchedUrls.some((u) => u.includes('registry.npmjs.org'))).toBe(
      false,
    );
  });
});
