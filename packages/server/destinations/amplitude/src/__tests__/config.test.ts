jest.mock('@amplitude/analytics-node', () => ({
  __esModule: true,
}));

import { createMockLogger } from '@walkeros/core';
import { getConfig } from '../config';

describe('getConfig', () => {
  it('throws when apiKey is missing', () => {
    const logger = createMockLogger();
    expect(() => getConfig({}, logger)).toThrow('apiKey missing');
  });

  it('returns config with defaults when apiKey is provided', () => {
    const logger = createMockLogger();
    const config = getConfig({ settings: { apiKey: 'test-key' } }, logger);
    expect(config.settings.apiKey).toBe('test-key');
  });
});
