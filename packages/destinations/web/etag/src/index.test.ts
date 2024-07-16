import type { WalkerOS } from '@elbwalker/types';
import type { WebClient } from '@elbwalker/walker.js';
import type { DestinationWebEtag } from '.';

describe('Destination etag', () => {
  jest.useFakeTimers();
  const mockSend = jest.fn();
  jest.mock('@elbwalker/utils', () => ({
    ...jest.requireActual('@elbwalker/utils'),
    getId: () => 1337,
    sendWebAsFetch: mockSend,
  }));

  let destination: DestinationWebEtag.Destination;
  const url = 'localhost?';
  const measurementId = 'G-XXXXXXX';
  const event = { event: 'entity action' } as WalkerOS.Event;
  // let customDefault: DestinationWebEtag.CustomConfig;

  function push(
    event: unknown,
    custom?: DestinationWebEtag.CustomConfig,
    instance?: WebClient.Instance,
  ) {
    destination.push(
      event as WalkerOS.Event,
      custom ? { custom } : destination.config,
      undefined,
      instance,
    );
  }

  beforeEach(() => {
    destination = jest.requireActual('.').default;
    destination.config = { custom: { measurementId, url } };
  });

  test('init', () => {
    push(event);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('push', () => {
    push(event);
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.stringContaining('en=entity+action&_et=1'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': expect.any(String),
        },
      }),
    );
  });

  test('default params', () => {
    push(event, { measurementId });

    expect(requestedUrl(mockSend)).toContain('v=2');
    expect(requestedUrl(mockSend)).toContain('tid=' + measurementId);
    expect(requestedUrl(mockSend)).toContain('gcs=G111');
    expect(requestedUrl(mockSend)).toContain('_p=1337');
    expect(requestedUrl(mockSend)).toMatch(/cid=\d+\.\d+/); // cid=number.number
    expect(requestedUrl(mockSend)).toContain('sid=1006242960'); // hash of undefined

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(String), // URL
      expect.any(String), // Body
      expect.any(Object), // Headers
    );
  });

  test('custom params', () => {
    push(event, {
      measurementId,
      params: { gcs: 'G222', tid: 'foo', sid: 1337 },
    });

    expect(requestedUrl(mockSend)).toContain('tid=foo');
    expect(requestedUrl(mockSend)).toContain('gcs=G222');
    expect(requestedUrl(mockSend)).toContain('sid=1337');

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(String), // URL
      expect.any(String), // Body
      expect.any(Object), // Headers
    );
  });

  test('session id', () => {
    push({});
    expect(requestedUrl(mockSend)).toContain('sid=1006242960'); // hash of undefined

    push({ user: { session: 's3ss10n1d' } });
    expect(requestedUrl(mockSend, 1)).toContain('sid=1875854770'); // hash of 's3ss10n1ds3ss10n1d'
  });

  test('session start', () => {
    push(event, destination.config.custom, {
      session: { isNew: true, isStart: true, count: 1 },
    } as WebClient.Instance);

    expect(requestedUrl(mockSend)).toContain('_ss=1');
    expect(requestedUrl(mockSend)).toContain('_nsi=1');
    expect(requestedUrl(mockSend)).toContain('_fv=1');
    expect(requestedUrl(mockSend)).toContain('sct=1');
  });

  test('user ids', () => {
    push({
      event: 'page view',
      user: {
        id: 'us3r',
        device: 'd3v1c3',
        session: 's3ss10n',
      },
    });

    expect(requestedUrl(mockSend)).toContain('uid=us3r');
    expect(requestedUrl(mockSend)).toContain('cid=1106139110'); // d3v1c3
    expect(requestedUrl(mockSend)).toContain('sid=1552924326'); // d3v1c3s3ss10n
  });

  test('engagement time', () => {
    push({
      event: 'e1',
    });

    jest.advanceTimersByTime(1337);
    push({
      event: 'e2',
    });

    expect(requestedBody(mockSend)).toContain('_et=1');
    expect(requestedBody(mockSend, 1)).toContain('_et=1337');
  });

  test('debug', () => {
    push(event, { measurementId, url, debug: true });

    expect(requestedUrl(mockSend)).toContain('_dbg=1');
  });
});

function requestedUrl(mockSend: jest.Mock, i = 0) {
  return mockSend.mock.calls[i][0];
}

function requestedBody(mockSend: jest.Mock, i = 0) {
  return mockSend.mock.calls[i][1];
}
