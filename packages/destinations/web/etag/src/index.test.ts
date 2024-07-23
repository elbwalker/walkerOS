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
  const event = { event: 'entity action', timing: 42 } as WalkerOS.Event;
  // let customDefault: DestinationWebEtag.CustomConfig;

  function push(
    event: unknown,
    custom?: DestinationWebEtag.CustomConfig,
    instance?: unknown,
  ) {
    destination.push(
      event as WalkerOS.Event,
      custom ? { custom } : destination.config,
      undefined,
      instance as WebClient.Instance,
    );
  }

  beforeEach(() => {
    destination = jest.requireActual('.').default;
    destination.config = { custom: { measurementId, url } };
    document.title = 'Demo';
  });

  test('init', () => {
    push(event);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('push', () => {
    push(event);
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.stringContaining('en=entity%20action&_et=1'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'User-Agent': expect.any(String),
        },
      }),
    );
  });

  test('data', () => {
    push({
      event: 'entity data',
      timing: 42,
      data: {
        id: 3.14,
        foo: 'bar',
      },
      globals: {
        glow: 'balls',
      },
      context: {
        env: ['dev', 0],
      },
    });

    expect(requestedBody(mockSend)).toContain('ep.data_foo=bar');
    expect(requestedBody(mockSend)).toContain('ep.globals_glow=balls');
    expect(requestedBody(mockSend)).toContain('ep.context_env=dev');
    expect(requestedBody(mockSend)).toContain('epn.data_id=3.14');
    expect(requestedBody(mockSend)).toContain('epn.event_timing=42');
  });

  test('page_view', () => {
    push(event);
    expect(requestedUrl(mockSend)).toContain('_s=1');
    expect(requestedBody(mockSend)).toContain('en=page_view');

    push(event); // Only once
    expect(requestedBody(mockSend, 1)).not.toContain('en=page_view');
  });

  test('hit count', () => {
    push(event);
    expect(requestedUrl(mockSend)).toContain('_s=1');

    push(event);
    expect(requestedBody(mockSend, 1)).not.toContain('_s=2');

    push(event);
    expect(requestedBody(mockSend, 1)).not.toContain('_s=3');
  });

  test('default params', () => {
    push(event, { measurementId });

    expect(requestedUrl(mockSend)).toContain('v=2');
    expect(requestedUrl(mockSend)).toContain('tid=' + measurementId);
    expect(requestedUrl(mockSend)).toContain('_z=fetch');
    expect(requestedUrl(mockSend)).toContain('tfd=42000');
    expect(requestedUrl(mockSend)).toMatch(/_p=\d/);
    expect(requestedUrl(mockSend)).toMatch(/cid=\d+\.\d+/); // cid=number.number
    expect(requestedUrl(mockSend)).toContain('sid=1006242960'); // hash of undefined
    expect(requestedUrl(mockSend)).toContain('dt=Demo'); // hash of undefined
    expect(requestedBody(mockSend)).toContain('_ee=1');

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

  test('event params', () => {
    push(event, {
      measurementId,
      paramsEvent: { 'ep.etagEvent': 'static' },
    });

    expect(requestedBody(mockSend)).toContain('ep.etagEvent=static');
  });

  test('consent params', () => {
    push(event, { measurementId });

    expect(requestedUrl(mockSend)).toContain('gcs=G111');
    expect(requestedUrl(mockSend)).toContain('dma=1');
    expect(requestedUrl(mockSend)).toContain('dma_cps=syphamo');
    expect(requestedUrl(mockSend)).toContain('pscdl=noapi');
  });

  test('session id', () => {
    push({});
    expect(requestedUrl(mockSend)).toContain('sid=1006242960'); // hash of undefined

    push({ user: { session: 's3ss10n1d' } });
    expect(requestedUrl(mockSend, 1)).toContain('sid=1875854770'); // hash of 's3ss10n1ds3ss10n1d'
  });

  test('session status', () => {
    push(event, destination.config.custom, {
      session: { isNew: true, isStart: true, count: 1 },
    });
    expect(requestedUrl(mockSend)).toContain('_ss=1');
    expect(requestedUrl(mockSend)).toContain('_nsi=1');
    expect(requestedUrl(mockSend)).toContain('_fv=1');
    expect(requestedUrl(mockSend)).toContain('sct=1');

    push(event, destination.config.custom, {
      session: { isNew: true, isStart: true, count: 1 },
    });
    expect(requestedUrl(mockSend, 1)).not.toContain('_ss=1');
    expect(requestedUrl(mockSend, 1)).not.toContain('_nsi=1');
    expect(requestedUrl(mockSend, 1)).not.toContain('_fv=1');

    destination.config.custom!.sentSession = false;
    push(event, destination.config.custom, {
      session: { storage: false, isStart: true },
    });
    expect(requestedUrl(mockSend, 2)).toContain('_ss=1');
    expect(requestedUrl(mockSend, 2)).toContain('_nsi=1');
    expect(requestedUrl(mockSend, 2)).toContain('_fv=1');
    expect(requestedUrl(mockSend, 2)).toContain('sct=1');
  });

  test('session engaged', () => {
    // no engagement
    push({});
    expect(requestedUrl(mockSend)).not.toContain('seg=1');

    // timing
    push({ timing: 11 });
    expect(requestedUrl(mockSend, 1)).toContain('seg=1');

    // previous engagement
    push(event);
    expect(requestedUrl(mockSend, 2)).toContain('seg=1');

    // multiple runs
    push(event, { measurementId }, { session: { runs: 2 } });
    expect(requestedUrl(mockSend, 3)).toContain('seg=1');

    // click trigger
    push({ trigger: 'click' }, { measurementId });
    expect(requestedUrl(mockSend, 4)).toContain('seg=1');
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

    // expect(requestedUrl(mockSend)).toContain('uid=us3r');
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

  test('device params', () => {
    push({
      event: 'entity action',
      user: {
        screenSize: '800x600',
      },
    });

    expect(requestedUrl(mockSend)).toContain('sr=800x600');
  });

  test('browser params', () => {
    const oldLanguage = navigator.language;
    const oldUserAgent = navigator.userAgent;

    Object.defineProperty(navigator, 'language', {
      value: 'de-DE',
      configurable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      configurable: true,
    });

    push(event);

    Object.defineProperty(navigator, 'language', { value: oldLanguage });
    Object.defineProperty(navigator, 'userAgent', { value: oldUserAgent });

    expect(requestedUrl(mockSend)).toContain('uap=macOS');
    expect(requestedUrl(mockSend)).toContain('ul=de-de');
    expect(requestedUrl(mockSend)).toContain('uamb=0');
  });

  test('header', () => {
    push(event, {
      measurementId,
      url,
      headers: {
        'Content-Type': 'overridden',
        'X-Test': 'test',
      },
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(String), // URL
      expect.any(String), // Body
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'overridden',
          'X-Test': 'test',
        }),
      }),
    );
  });
});

function requestedUrl(mockSend: jest.Mock, i = 0) {
  return mockSend.mock.calls[i][0];
}

function requestedBody(mockSend: jest.Mock, i = 0) {
  return mockSend.mock.calls[i][1];
}
