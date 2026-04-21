import { destinationCustomerIo } from '..';
import type { Settings, CustomerIoTrackClientMock } from '../types';

describe('init', () => {
  it('throws when siteId is missing', () => {
    const logger = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      throw: jest.fn((msg: string) => {
        throw new Error(msg);
      }),
    };

    expect(() =>
      destinationCustomerIo.init!({
        config: { settings: { apiKey: 'test-key' } },
        logger,
        id: 'test',
      } as never),
    ).toThrow('siteId');
  });

  it('throws when apiKey is missing', () => {
    const logger = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      throw: jest.fn((msg: string) => {
        throw new Error(msg);
      }),
    };

    expect(() =>
      destinationCustomerIo.init!({
        config: { settings: { siteId: 'test-site' } },
        logger,
        id: 'test',
      } as never),
    ).toThrow('apiKey');
  });
});

describe('destroy', () => {
  it('clears client references', async () => {
    const mockTrackClient = {
      identify: jest.fn(),
      track: jest.fn(),
      trackAnonymous: jest.fn(),
      trackPageView: jest.fn(),
      destroy: jest.fn(),
      suppress: jest.fn(),
      unsuppress: jest.fn(),
      addDevice: jest.fn(),
      deleteDevice: jest.fn(),
      mergeCustomers: jest.fn(),
    } as unknown as CustomerIoTrackClientMock;
    const config = {
      settings: {
        siteId: 'test',
        apiKey: 'test',
        _trackClient: mockTrackClient,
        _apiClient: { sendEmail: jest.fn(), sendPush: jest.fn() },
      } as Settings,
    };

    await destinationCustomerIo.destroy!({ config } as never);

    expect(config.settings._trackClient).toBeUndefined();
    expect(config.settings._apiClient).toBeUndefined();
  });

  it('does nothing when no clients exist', async () => {
    const config = {
      settings: { siteId: 'test', apiKey: 'test' } as Settings,
    };

    // Should not throw
    await destinationCustomerIo.destroy!({ config } as never);
  });
});
