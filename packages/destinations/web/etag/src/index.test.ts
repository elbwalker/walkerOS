import type { WalkerOS } from '@elbwalker/types';
import type { WebClient } from '@elbwalker/walker.js';
import type { DestinationWebEtag } from '.';

describe('Destination etag', () => {
  const mockSend = jest.fn();
  jest.mock('@elbwalker/utils', () => ({
    ...jest.requireActual('@elbwalker/utils'),
    sendWebAsFetch: mockSend,
  }));

  let destination: DestinationWebEtag.Destination;
  const url = 'localhost';
  const measurementId = 'G-XXXXXXX';
  const event = { event: 'entity action' } as WalkerOS.Event;
  let customDefault: DestinationWebEtag.CustomConfig;

  function push(
    event: WalkerOS.Event,
    custom: DestinationWebEtag.CustomConfig = customDefault,
  ) {
    destination.push(event, { custom });
  }

  beforeEach(() => {
    destination = jest.requireActual('.').default;
    customDefault = { measurementId, url };
  });

  test('init', () => {
    push(event);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('push', () => {
    push(event);
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining(url),
      undefined,
      expect.objectContaining({
        method: 'POST',
        headers: {},
      }),
    );
  });

  test('default params', () => {
    push(event, { measurementId });

    const requestedUrl = mockSend.mock.calls[0][0];
    expect(requestedUrl).toContain('v=2');
    expect(requestedUrl).toContain('tid=' + measurementId);
    expect(requestedUrl).toContain('gcs=G111');
    expect(requestedUrl).toContain('_p=');
    expect(requestedUrl).toContain('cid=1234567890.');
    expect(requestedUrl).toContain('sid=1108123762'); // hash of 42

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.any(Object),
    );
  });

  test('custom params', () => {
    push(event, {
      measurementId,
      params: { gcs: 'G222', tid: 'foo', sid: 1337 },
    });

    const requestedUrl = mockSend.mock.calls[0][0];
    expect(requestedUrl).toContain('tid=foo');
    expect(requestedUrl).toContain('gcs=G222');
    expect(requestedUrl).toContain('sid=1337');

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.any(Object),
    );
  });

  test('session id', () => {
    push({} as WalkerOS.Event, customDefault);
    expect(mockSend.mock.calls[0][0]).toContain('sid=1108123762'); // hash of '42'

    push({ user: { session: 's3ss10n1d' } } as WalkerOS.Event, customDefault);
    expect(mockSend.mock.calls[1][0]).toContain('sid=1049599702'); // hash of 's3ss10n1d'
  });
});
