import type { WalkerOS } from '@elbwalker/types';
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

  function push(
    event: WalkerOS.Event,
    custom: DestinationWebEtag.CustomConfig = { url, measurementId },
  ) {
    destination.push(event, { custom });
  }

  beforeEach(() => {
    destination = jest.requireActual('.').default;
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
    expect(requestedUrl).toContain('cid=99999999.');

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.any(Object),
    );
  });

  test('custom params', () => {
    push(event, { measurementId, params: { gcs: 'G222', tid: 'foo' } });

    const requestedUrl = mockSend.mock.calls[0][0];
    expect(requestedUrl).toContain('tid=foo');
    expect(requestedUrl).toContain('gcs=G222');

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.any(Object),
    );
  });
});
