jest.mock('@google-cloud/pubsub');

import { getConfig } from '../config';
import type { PartialConfig, ServiceAccountCredentials } from '../types';
import { createMockLogger } from '@walkeros/core';

const serviceAccount: ServiceAccountCredentials = {
  client_email: 'sa@example.com',
  private_key: '-----BEGIN PRIVATE KEY-----',
};

const otherAccount: ServiceAccountCredentials = {
  client_email: 'other@example.com',
  private_key: '-----BEGIN OTHER KEY-----',
};

function baseConfig(extra: Partial<PartialConfig> = {}): PartialConfig {
  return {
    settings: { projectId: 'p', topic: 'events' },
    ...extra,
  };
}

describe('Pub/Sub config.credentials precedence', () => {
  test('config.credentials wins over settings.credentials', () => {
    const logger = createMockLogger();
    const config = getConfig(
      {
        settings: {
          projectId: 'p',
          topic: 'events',
          credentials: otherAccount,
        },
        credentials: serviceAccount,
      },
      undefined,
      logger,
    );

    expect(config.settings.credentials).toEqual(serviceAccount);
    // config path used, so no deprecation warning
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('config.credentials supports a JSON string', () => {
    const logger = createMockLogger();
    const config = getConfig(
      baseConfig({ credentials: JSON.stringify(serviceAccount) }),
      undefined,
      logger,
    );

    expect(config.settings.credentials).toEqual(serviceAccount);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('settings.credentials still works and warns once', () => {
    const logger = createMockLogger();
    const config = getConfig(
      {
        settings: {
          projectId: 'p',
          topic: 'events',
          credentials: serviceAccount,
        },
      },
      undefined,
      logger,
    );

    expect(config.settings.credentials).toEqual(serviceAccount);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'settings.credentials is deprecated; use config.credentials',
    );
  });

  test('no credentials: no warning, credentials undefined', () => {
    const logger = createMockLogger();
    const config = getConfig(baseConfig(), undefined, logger);

    expect(config.settings.credentials).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
