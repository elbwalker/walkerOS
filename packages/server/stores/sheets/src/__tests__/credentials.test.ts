import { createMockLogger } from '@walkeros/core';
import type { ServiceAccount } from '@walkeros/core';
import { resolveCredentials } from '../credentials';
import type { ServiceAccountCredentials } from '../types';

const SA: ServiceAccount = {
  client_email: 'config@example.com',
  private_key: 'config-key',
};

const SETTINGS_SA: ServiceAccountCredentials = {
  client_email: 'settings@example.com',
  private_key: 'settings-key',
};

describe('resolveCredentials', () => {
  it('prefers config.credentials over settings.credentials', () => {
    const logger = createMockLogger();
    const result = resolveCredentials(
      { credentials: SA, settings: { credentials: SETTINGS_SA } },
      logger,
    );

    expect(result).toEqual(SA);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('falls back to settings.credentials and warns once when config.credentials is absent', () => {
    const logger = createMockLogger();
    const result = resolveCredentials(
      { settings: { credentials: SETTINGS_SA } },
      logger,
    );

    expect(result).toEqual(SETTINGS_SA);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'settings.credentials is deprecated; use config.credentials',
    );
  });

  it('does not warn when config.credentials is used', () => {
    const logger = createMockLogger();
    resolveCredentials({ credentials: SA }, logger);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not fall through to settings when config.credentials is an empty string', () => {
    const logger = createMockLogger();
    const result = resolveCredentials(
      { credentials: '', settings: { credentials: SETTINGS_SA } },
      logger,
    );

    // `??` keeps the explicit empty-string so a misconfig surfaces.
    expect(result).toBe('');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined (ADC) when neither slot is set', () => {
    const logger = createMockLogger();
    const result = resolveCredentials({ settings: {} }, logger);

    expect(result).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
