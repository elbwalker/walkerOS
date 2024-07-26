import type { WalkerOS } from '@elbwalker/types';
import type { State } from '../types';
import {
  getBrowserParams,
  getClientId,
  getConsentMode,
  getDeviceParams,
  getDocumentParams,
  getEventParams,
  getPageViewEvent,
  getParams,
  getSessionParams,
} from '..';

describe('Destination core etag', () => {
  jest.useFakeTimers();
  let event: WalkerOS.Event;
  let session: WalkerOS.SessionData;
  let state: State;

  const measurementId = 'G-XXXXXXX';
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const user = {
    id: 'us3r',
    device: 'd3v1c3',
    session: 's3ss10n',
  };

  beforeEach(() => {
    event = {
      event: 'entity data',
      data: {
        id: 3.14,
        foo: 'bar',
      },
      context: {
        env: ['dev', 0],
      },
      globals: {
        glow: 'balls',
      },
      user,
      timing: 42,
      source: {
        id: 'localhost',
        previous_id: 'remotehost',
      },
    } as unknown as WalkerOS.Event;

    session = {
      id: 's3ss10n',
      isNew: true,
      isStart: true,
      count: 1,
      start: 1565005062,
      storage: true,
    };

    state = {
      lastEngagement: 1,
      isEngaged: false,
    };
  });

  test('getBrowserParams', () => {
    expect(getBrowserParams(userAgent, 'de-DE')).toStrictEqual({
      uap: 'macOS',
      uamb: 0,
      ul: 'de-de',
    });

    expect(getBrowserParams()).toStrictEqual({});
  });

  test('getClientId', () => {
    expect(getClientId(user, session)).toStrictEqual({
      cid: '1106139110.1565005062',
    });
  });

  test('getConsentMode', () => {
    expect(getConsentMode()).toStrictEqual({
      gcs: 'G111',
      dma: 1,
      dma_cps: 'syphamo',
      pscdl: 'noapi',
    });
  });

  test('getDeviceParams', () => {
    expect(getDeviceParams({ screenSize: '800x600' })).toStrictEqual({
      sr: '800x600',
    });
  });

  test('getDocumentParams', () => {
    expect(getDocumentParams(event, 'Demo')).toStrictEqual({
      dt: 'Demo',
      dl: 'localhost',
      dr: 'remotehost',
    });
  });

  test('getEventParams', () => {
    expect(getEventParams(event, state, { 'ep.cus': 'tom' })).toStrictEqual({
      en: 'entity data',
      _et: expect.any(Number),
      'epn.data_id': 3.14,
      'epn.event_timing': 42,
      'ep.data_foo': 'bar',
      'ep.context_env': 'dev',
      'ep.globals_glow': 'balls',
      'ep.source_id': 'localhost',
      'ep.source_previous_id': 'remotehost',
      'ep.user_device': 'd3v1c3',
      'ep.user_id': 'us3r',
      'ep.user_session': 's3ss10n',
      'ep.cus': 'tom',
    });

    expect(state.lastEngagement).toBeGreaterThan(1);

    expect(
      getEventParams({ ...event, trigger: 'etag' }, state, {
        'ep.cus': 'tom',
      }),
    ).toStrictEqual(
      expect.objectContaining({
        _ee: 1,
      }),
    );
  });

  test('getPageViewEvent', () => {
    const params = getPageViewEvent(event);
    expect(params).toStrictEqual({
      ...event,
      event: 'page_view',
      entity: 'page',
      action: 'view',
      trigger: 'etag',
      id: expect.any(String),
      count: 0,
      data: {},
      context: {},
    });
  });

  test('getParams', () => {
    event.user.screenSize = '800x600';

    const { path } = getParams(
      event,
      {
        debug: true,
        lastEngagement: 1,
        measurementId,
        params: { gcs: 'G111' },
        paramsEvent: { 'epn.data_id': 3.14, 'epn.event_timing': 42 },
      },
      {
        language: 'de-DE',
        pageTitle: 'Demo',
        session,
        userAgent,
      },
    );
    expect(path).toStrictEqual({
      // Basic
      v: '2',
      tid: measurementId,
      cid: expect.any(String),
      _s: 1,
      _p: expect.any(Number),
      _z: 'fetch',
      _dbg: 1,
      tfd: expect.any(Number),
      // Browser
      uap: expect.any(String),
      uamb: expect.any(Number),
      ul: expect.any(String),
      // Consent
      gcs: 'G111',
      dma: 1,
      dma_cps: 'syphamo',
      pscdl: 'noapi',
      // Device
      sr: expect.any(String),
      // Document
      dl: expect.any(String),
      dr: expect.any(String),
      dt: expect.any(String),
      // Session
      sid: expect.any(Number),
      seg: expect.any(Number),
      _ss: 1,
      _nsi: 1,
      _fv: 1,
      sct: 1,
      // Event
      en: 'entity data',
      _et: expect.any(Number),
      'epn.data_id': 3.14,
      'epn.event_timing': 42,
      'ep.data_foo': 'bar',
      'ep.context_env': 'dev',
      'ep.globals_glow': 'balls',
      'ep.source_id': 'localhost',
      'ep.source_previous_id': 'remotehost',
      'ep.user_device': 'd3v1c3',
      'ep.user_id': 'us3r',
      'ep.user_screenSize': '800x600',
      'ep.user_session': 's3ss10n',
    });
  });

  test('getSessionParams', () => {
    expect(getSessionParams(event, state, session)).toStrictEqual(
      expect.objectContaining({
        _fv: 1,
        _nsi: 1,
        _ss: 1,
        sct: 1,
        seg: 1,
        sid: 1552924326,
      }),
    );

    // Session status already sent
    expect(getSessionParams(event, state)).not.toStrictEqual(
      expect.objectContaining({
        _fv: 1,
        _nsi: 1,
        _ss: 1,
        sct: 1,
      }),
    );

    const sessionCookieless: WalkerOS.SessionData = {
      storage: false,
      isStart: true,
    };
    expect(
      getSessionParams(event, { ...state }, sessionCookieless),
    ).toStrictEqual(
      expect.objectContaining({
        _fv: 1,
        _nsi: 1,
        _ss: 1,
        sct: 1,
        seg: 1,
        sid: 1552924326,
      }),
    );

    const sessionSecond: WalkerOS.SessionData = {
      storage: true,
      isStart: true,
      count: 2,
    };
    expect(getSessionParams(event, { ...state }, sessionSecond)).toStrictEqual({
      _ss: 1,
      sct: 2,
      seg: 1,
      sid: 1552924326,
    });

    const sessionExisting: WalkerOS.SessionData = {
      storage: true,
      isStart: false,
      count: 2,
    };
    expect(
      getSessionParams(event, { ...state }, sessionExisting),
    ).toStrictEqual({
      sct: 2,
      seg: 1,
      sid: 1552924326,
    });
  });
});
