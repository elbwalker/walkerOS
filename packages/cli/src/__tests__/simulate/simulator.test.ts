import path from 'path';
import { simulate } from '../../simulate/simulator';
import { Collector } from '@walkeros/core';

// Mock package-manager to avoid network calls and return empty results
jest.mock('../../bundle/package-manager', () => ({
  downloadPackages: jest.fn().mockResolvedValue(new Map()),
}));

describe('Simulate', () => {
  it('should handle package manager errors gracefully', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'product view', data: { id: 'P123' } };

    const result = await simulate(configPath, event, {
      json: true,
      verbose: true,
    });

    // With mocked packages that return empty map, this will fail to bundle
    // but should fail gracefully without crashing
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');

    // Either succeeds or fails gracefully
    if (result.success) {
      expect(result.error).toBeUndefined();
    } else {
      expect(typeof result.error).toBe('string');
    }
  }, 30000);
});
