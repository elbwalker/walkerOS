import path from 'path';
import { simulate } from '../../simulate/simulator';
import { Collector } from '@walkeros/core';

// Mock package-manager to use local packages instead of npm downloads
jest.mock('../../bundle/package-manager', () => ({
  downloadPackages: jest.fn().mockImplementation(async () => {
    const path = require('path');
    // Point to actual built packages in the monorepo
    const packagesRoot = path.resolve(__dirname, '../../../../../packages');

    return new Map([
      ['@walkeros/collector', path.join(packagesRoot, 'collector')],
      ['@walkeros/core', path.join(packagesRoot, 'core')],
      [
        '@walkeros/web-source-browser',
        path.join(packagesRoot, 'web/sources/browser'),
      ],
      [
        '@walkeros/web-source-datalayer',
        path.join(packagesRoot, 'web/sources/dataLayer'),
      ],
      [
        '@walkeros/web-destination-gtag',
        path.join(packagesRoot, 'web/destinations/gtag'),
      ],
      [
        '@walkeros/web-destination-api',
        path.join(packagesRoot, 'web/destinations/api'),
      ],
    ]);
  }),
}));

describe('Simulate', () => {
  it('should run', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'product view', data: { id: 'P123' } };

    const result = await simulate(configPath, event, {
      json: true,
      verbose: true,
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify collector state
    const collector = result.collector as Collector.Instance;

    // Our simulated product view event should be second
    expect(collector.queue[1]).toMatchObject(event);
    expect(collector.destinations.gtag).toBeDefined();

    // Verify console.log calls were captured
    expect(result.logs).toBeDefined();
    expect(Array.isArray(result.logs)).toBe(true);
    expect(result.logs).toContainEqual(['simulation start']);

    // Verify API usage was captured
    expect(result.usage).toBeDefined();
    expect(typeof result.usage).toBe('object');

    // Should have API calls for both destinations
    expect(result.usage?.api).toBeDefined();
    expect(Array.isArray(result.usage?.api)).toBe(true);
    expect(result.usage?.gtag).toBeDefined();
    expect(Array.isArray(result.usage?.gtag)).toBe(true);
  }, 30000);
});
