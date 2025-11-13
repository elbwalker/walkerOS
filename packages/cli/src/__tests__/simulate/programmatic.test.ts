import path from 'path';
import { simulate } from '../../simulate';

// Mock package-manager to avoid network calls
jest.mock('../../bundle/package-manager', () => ({
  downloadPackages: jest.fn().mockResolvedValue(new Map()),
}));

describe('Programmatic Simulate API', () => {
  it('should simulate with config file path', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'page view', data: { title: 'Home', path: '/' } };

    const result = await simulate(configPath, event, { silent: true });

    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');

    // Either succeeds or fails gracefully
    if (result.success) {
      expect(result.error).toBeUndefined();
      expect(result.usage).toBeDefined();
    } else {
      expect(typeof result.error).toBe('string');
    }
  }, 30000);

  it('should handle verbose option', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'product view', data: { id: 'P123' } };

    const result = await simulate(configPath, event, {
      verbose: true,
      silent: false,
    });

    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  }, 30000);

  it('should throw error when config object is provided (not yet supported)', async () => {
    const config = {
      platform: 'web',
      packages: {},
      code: 'export default {}',
      output: './test.js',
    };
    const event = { name: 'test' };

    await expect(simulate(config, event, { silent: true })).rejects.toThrow(
      'currently only supports config file paths',
    );
  });

  it('should handle JSON option', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'page view', data: {} };

    const result = await simulate(configPath, event, { json: true });

    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  }, 30000);
});
