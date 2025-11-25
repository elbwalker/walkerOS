import type { WalkerOS, Collector } from '@walkeros/core';
import type { DestinationAPI } from '.';
import { startFlow } from '@walkeros/collector';
import { createEvent, clone } from '@walkeros/core';
import { examples } from './dev';

describe('Destination API', () => {
  const mockSendWeb = jest.fn(); //.mockImplementation(console.log);

  let destination: DestinationAPI.Destination;
  let event: WalkerOS.Event;
  const url = 'https://api.example.com/';

  // Create test environment using clone and modify sendWeb function
  const testEnv = clone(examples.env.push);
  testEnv.sendWeb = mockSendWeb;

  beforeEach(async () => {
    jest.clearAllMocks();

    destination = jest.requireActual('.').default;
    event = createEvent();
    await startFlow({
      tagging: 2,
    });
  });

  test('init', () => {
    // Test with no URL - should not call sendWeb
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {},
      env: testEnv,
    });
    expect(mockSendWeb).not.toHaveBeenCalled();

    // Test with URL - should call sendWeb
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: { settings: { url } },
      env: testEnv,
    });
    expect(mockSendWeb).toHaveBeenCalledTimes(1);

    const [calledUrl, calledData, calledOptions] = mockSendWeb.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(calledData)).toEqual(event);
    expect(calledOptions).toEqual(
      expect.objectContaining({
        transport: 'fetch',
      }),
    );
  });

  test('environment customization', () => {
    const customSendWeb = jest.fn();
    const customEnv = { sendWeb: customSendWeb };

    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url },
      },
      env: customEnv,
    });

    expect(customSendWeb).toHaveBeenCalledTimes(1);
    expect(customSendWeb).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.objectContaining({ transport: 'fetch' }),
    );

    // Verify mockSendWeb was not called
    expect(mockSendWeb).not.toHaveBeenCalled();
  });

  test('transform', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, transform: () => 'transformed' },
      },
      env: testEnv,
    });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, headers: { foo: 'bar' } },
      },
      env: testEnv,
    });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url, method: 'POST' },
      },
      env: testEnv,
    });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('event entity action', () => {
    destination.push(event, {
      collector: {} as Collector.Instance,
      config: {
        settings: { url },
        mapping: examples.mapping.config,
      },
      env: testEnv,
    });

    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      JSON.stringify(event),
      expect.any(Object),
    );
  });
});
