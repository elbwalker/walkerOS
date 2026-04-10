import { getConfig } from '../config';
import type { Env, MixpanelClient } from '../types';
import { createMockLogger } from '@walkeros/core';

const mockClient: MixpanelClient = {
  track: jest.fn(),
  import: jest.fn(),
  alias: jest.fn(),
  people: {
    set: jest.fn(),
    set_once: jest.fn(),
    increment: jest.fn(),
    append: jest.fn(),
    union: jest.fn(),
    remove: jest.fn(),
    unset: jest.fn(),
    delete_user: jest.fn(),
  },
  groups: {
    set: jest.fn(),
    set_once: jest.fn(),
    union: jest.fn(),
    remove: jest.fn(),
    unset: jest.fn(),
    delete_group: jest.fn(),
  },
};

const mockEnv: Env = {
  Mixpanel: {
    init: jest.fn().mockReturnValue(mockClient) as (
      ...args: unknown[]
    ) => MixpanelClient,
  },
};

describe('getConfig', () => {
  const logger = createMockLogger();

  it('should throw when apiKey is missing', () => {
    expect(() => getConfig({}, mockEnv, logger)).toThrow();
  });

  it('should return config with client when apiKey is provided', () => {
    const config = getConfig(
      { settings: { apiKey: 'test-token' } },
      mockEnv,
      logger,
    );
    expect(config.settings.client).toBe(mockClient);
    expect(config.settings.apiKey).toBe('test-token');
    expect(mockEnv.Mixpanel!.init).toHaveBeenCalledWith('test-token', {});
  });

  it('should pass SDK options to init', () => {
    (mockEnv.Mixpanel!.init as jest.Mock).mockClear();
    getConfig(
      {
        settings: {
          apiKey: 'test-token',
          host: 'api-eu.mixpanel.com',
          secret: 'my-secret',
          debug: true,
        },
      },
      mockEnv,
      logger,
    );
    expect(mockEnv.Mixpanel!.init).toHaveBeenCalledWith('test-token', {
      host: 'api-eu.mixpanel.com',
      secret: 'my-secret',
      debug: true,
    });
  });

  it('should warn when useImport is true without secret', () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    getConfig(
      {
        settings: {
          apiKey: 'test-token',
          useImport: true,
        },
      },
      mockEnv,
      logger,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'useImport requires secret for /import authentication',
    );
    warnSpy.mockRestore();
  });
});

describe('destroy', () => {
  it('should clear client reference', () => {
    const dest = require('../').default;
    const logger = createMockLogger();
    const config = getConfig(
      { settings: { apiKey: 'test-token' } },
      mockEnv,
      logger,
    );
    expect(config.settings.client).toBeDefined();

    dest.destroy?.({ config, logger, id: 'test', env: mockEnv });
    expect(config.settings.client).toBeUndefined();
  });
});
