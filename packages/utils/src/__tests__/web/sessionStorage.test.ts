import { getId, getMarketingParameters, tryCatch } from '../..';
import sessionStorage from '../../web/session/sessionStorage';

describe('SessionStorage', () => {
  const w = window;
  const mockStorageRead = jest.fn();
  const mockStorageWrite = jest.fn();
  const utils = {
    getId,
    getMarketingParameters,
    storageRead: mockStorageRead,
    storageWrite: mockStorageWrite,
    tryCatch,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();

    Object.defineProperty(w, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
      writable: true,
    });
  });

  test('Regular first session', () => {
    // Reload with marketing parameter
    expect(sessionStorage({}, utils)).toStrictEqual({
      id: expect.any(String),
      start: expect.any(Number),
      referrer: expect.any(String),
      updated: expect.any(Number),
      isNew: true,
      isFirst: true,
      count: 1,
      runs: 1,
    });
  });

  test('Existing active session', () => {
    const start = Date.now();
    const session = {
      id: 'sessionId',
      start,
      referrer: 'org',
      updated: start,
      isNew: false,
      isFirst: true,
      count: 1,
      runs: 1,
    };

    mockStorageRead.mockReturnValue(JSON.stringify(session));
    jest.advanceTimersByTime(1000);

    const newSession = sessionStorage({}, utils);

    expect(newSession).toStrictEqual({
      ...session,
      updated: start + 1000,
      isNew: false,
      isFirst: false,
      runs: 2,
    });
  });

  test('Existing expired session', () => {
    let now = Date.now();
    const yesterday = now - 1000 * 60 * 60 * 24; // 24 hours ago
    const session = {
      id: 'sessionId',
      start: yesterday,
      referrer: 'org',
      updated: yesterday,
      isNew: false,
      isFirst: true,
      count: 1,
      runs: 1,
    };

    mockStorageRead.mockReturnValue(JSON.stringify(session));
    jest.advanceTimersByTime(1000);
    now += 1000;

    const newSession = sessionStorage({ length: 1 }, utils);

    expect(newSession).toStrictEqual(
      expect.objectContaining({
        start: now,
        updated: now,
        isNew: true,
        isFirst: false,
        count: 2,
        runs: 1,
      }),
    );

    // Id should be different to previous session
    expect(newSession.id).toHaveLength(12);
  });

  test('Storage Session Options', () => {
    sessionStorage({}, utils);
    expect(mockStorageRead).toHaveBeenCalledWith('elbSessionId', 'local');

    sessionStorage({ sessionKey: 'customKey' }, utils);
    expect(mockStorageRead).toHaveBeenCalledWith('customKey', 'local');

    sessionStorage({ sessionStorage: 'session' }, utils);
    expect(mockStorageRead).toHaveBeenCalledWith('elbSessionId', 'session');
  });

  test('Storage error', () => {
    mockStorageRead.mockReturnValue('invalid');
    expect(sessionStorage({}, utils)).toStrictEqual({
      id: expect.any(String),
      start: expect.any(Number),
      updated: expect.any(Number),
      isNew: true,
      isFirst: true,
      referrer: '',
      count: 1,
      runs: 1,
    });
  });

  test('Session write to storage', () => {
    const session = {
      id: 'sessionId',
      start: Date.now(),
      referrer: 'org',
      updated: Date.now(),
      isNew: false,
      isFirst: true,
      count: 1,
      runs: 1,
    };

    jest.advanceTimersByTime(1000);
    mockStorageRead.mockReturnValue(JSON.stringify(session));

    sessionStorage({}, utils);
    expect(mockStorageWrite).toHaveBeenCalledWith(
      'elbSessionId',
      expect.any(String),
      30,
      'local',
    );
    const obj = JSON.parse(mockStorageWrite.mock.calls[0][1]);
    expect(obj).toStrictEqual(
      expect.objectContaining({
        start: session.start, // Still the same
        updated: session.updated + 1000, // Updated timestamp
        isFirst: false, // Not longer first visit
        runs: 2, // Increased number of runs
      }),
    );
  });

  test('Session update options', () => {
    sessionStorage({}, utils);
    expect(mockStorageWrite).toHaveBeenCalledWith(
      'elbSessionId',
      expect.any(String),
      30,
      'local',
    );

    sessionStorage(
      { sessionAge: 5, sessionKey: 'foo', sessionStorage: 'session' },
      utils,
    );
    expect(mockStorageWrite).toHaveBeenCalledWith(
      'foo',
      expect.any(String),
      5,
      'session',
    );
  });

  test('Session default data', () => {
    const session = sessionStorage(
      { data: { foo: 'bar', count: 9001 } },
      utils,
    );

    expect(session).toStrictEqual(
      expect.objectContaining({
        id: expect.any(String),
        count: 9001,
      }),
    );
  });
});
