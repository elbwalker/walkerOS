jest.mock('@amplitude/analytics-node', () => ({
  __esModule: true,
}));

import { getConfig } from '../config';

describe('getConfig', () => {
  it('throws a config StepError when apiKey is missing', () => {
    expect(() => getConfig({})).toThrow(
      expect.objectContaining({
        name: 'StepError',
        code: 'config',
        message: 'Config settings apiKey missing',
      }),
    );
  });

  it('returns config with defaults when apiKey is provided', () => {
    const config = getConfig({ settings: { apiKey: 'test-key' } });
    expect(config.settings.apiKey).toBe('test-key');
  });
});
