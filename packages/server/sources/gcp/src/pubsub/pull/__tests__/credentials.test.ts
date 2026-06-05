jest.mock('@google-cloud/pubsub');

import { __getMockCalls, __resetMockCalls } from '@google-cloud/pubsub';
import { createMockLogger } from '@walkeros/core';
import type { ServiceAccount } from '@walkeros/core';
import { getConfig } from '../config';
import type { PartialConfig } from '../types';

const SA_CONFIG: ServiceAccount = {
  client_email: 'config@iam.example.com',
  private_key: 'config-key',
};

const SA_SETTINGS: ServiceAccount = {
  client_email: 'settings@iam.example.com',
  private_key: 'settings-key',
};

// The package's PubSub mock records every constructor call as a `PubSub.ctor`
// entry whose first arg is the resolved ClientConfig; assert on its credentials.
function ctorCredentials(): unknown {
  const ctor = __getMockCalls().find((c) => c.method === 'PubSub.ctor');
  const options = ctor?.args[0];
  if (typeof options !== 'object' || options === null) return undefined;
  return (options as { credentials?: unknown }).credentials;
}

describe('pull source credentials resolution', () => {
  beforeEach(() => {
    __resetMockCalls();
  });

  it('prefers config.credentials over settings.credentials', () => {
    const logger = createMockLogger();
    const config: PartialConfig = {
      credentials: SA_CONFIG,
      settings: {
        projectId: 'p',
        subscription: 'sub',
        credentials: SA_SETTINGS,
      },
    };

    getConfig(config, undefined, logger);

    expect(ctorCredentials()).toEqual(SA_CONFIG);
    // config path used -> no deprecation warning.
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('falls back to settings.credentials and warns once when deprecated', () => {
    const logger = createMockLogger();
    const config: PartialConfig = {
      settings: {
        projectId: 'p',
        subscription: 'sub',
        credentials: SA_SETTINGS,
      },
    };

    getConfig(config, undefined, logger);

    expect(ctorCredentials()).toEqual(SA_SETTINGS);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'settings.credentials is deprecated; use config.credentials instead',
    );
  });

  it('does not warn when no credentials are supplied (ADC)', () => {
    const logger = createMockLogger();
    const config: PartialConfig = {
      settings: { projectId: 'p', subscription: 'sub' },
    };

    getConfig(config, undefined, logger);

    expect(ctorCredentials()).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('parses a config.credentials JSON string', () => {
    const logger = createMockLogger();
    const config: PartialConfig = {
      credentials: JSON.stringify(SA_CONFIG),
      settings: { projectId: 'p', subscription: 'sub' },
    };

    getConfig(config, undefined, logger);

    expect(ctorCredentials()).toEqual(SA_CONFIG);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
