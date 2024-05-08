import { sessionStorage } from '../../';
import * as storage from '../../web/storage';

// Automatically mock the storage module
jest.mock('../../web/storage', () => ({
  storageRead: jest.fn(),
  storageWrite: jest.fn(),
}));

describe('SessionStorage', () => {
  const w = window;
  const device = 'd3v1c3';

  const mockStorageWrite = storage.storageWrite as jest.Mock;
  const mockStorageRead = storage.storageRead as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();

    mockStorageWrite.mockReset();
    mockStorageRead.mockReset();

    Object.defineProperty(w, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
      writable: true,
    });
  });

  test('Regular first session', () => {
    // Reload with marketing parameter
    expect(sessionStorage()).toStrictEqual({
      isStart: true,
      storage: true,
      id: expect.any(String),
      start: expect.any(Number),
      referrer: expect.any(String),
      updated: expect.any(Number),
      isNew: true,
      device: expect.any(String),
      count: 1,
      runs: 1,
    });
  });

  test('Existing active session', () => {
    const start = Date.now();
    const session = {
      isStart: false,
      storage: true,
      id: 'sessionId',
      start,
      referrer: 'org',
      updated: start,
      isNew: true,
      count: 1,
      runs: 1,
    };

    mockStorageRead.mockImplementation((config) => {
      return { ...config.data, mock: 'window' };
    });

    mockStorageRead
      .mockReturnValue(JSON.stringify(session))
      .mockReturnValueOnce(device);
    jest.advanceTimersByTime(1000);

    const newSession = sessionStorage({});

    expect(newSession).toStrictEqual({
      ...session,
      device,
      updated: start + 1000,
      isStart: false,
      isNew: false,
      runs: 2,
    });
  });

  test('New storage session only', () => {
    // Using window only wouldn't detect a new session
    window.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'reload' }]);

    const session = sessionStorage();
    expect(session).toStrictEqual(
      expect.objectContaining({
        isStart: true,
        id: expect.any(String),
        device: expect.any(String),
      }),
    );

    expect(session.device).toHaveLength(8);
    expect(session.id).toHaveLength(12);
  });

  test('Existing expired session', () => {
    let now = Date.now();
    const yesterday = now - 1000 * 60 * 60 * 24; // 24 hours ago
    const session = {
      id: 'sessionId',
      start: yesterday,
      referrer: 'org',
      updated: yesterday,
      isStart: false,
      isNew: true,
      count: 1,
      runs: 1,
    };

    mockStorageRead
      .mockReturnValue(JSON.stringify(session))
      .mockReturnValueOnce(device);
    jest.advanceTimersByTime(1000);
    now += 1000;

    const newSession = sessionStorage({ length: 1 });

    expect(newSession).toStrictEqual(
      expect.objectContaining({
        start: now,
        updated: now,
        isStart: true,
        isNew: false,
        device,
        count: 2,
        runs: 1,
      }),
    );

    // Id should be different to previous session
    expect(newSession.id).toHaveLength(12);
  });

  test('Storage Session Options', () => {
    sessionStorage({});
    expect(mockStorageRead).toHaveBeenCalledWith('elbDeviceId', 'local');
    expect(mockStorageRead).toHaveBeenCalledWith('elbSessionId', 'local');

    sessionStorage({ deviceKey: 'dKey', sessionKey: 'sKey' });
    expect(mockStorageRead).toHaveBeenCalledWith('dKey', 'local');
    expect(mockStorageRead).toHaveBeenCalledWith('sKey', 'local');

    sessionStorage({ deviceStorage: 'session', sessionStorage: 'session' });
    expect(mockStorageRead).toHaveBeenCalledWith('elbDeviceId', 'session');
    expect(mockStorageRead).toHaveBeenCalledWith('elbSessionId', 'session');
  });

  test('Storage error', () => {
    mockStorageRead.mockReturnValue('invalid').mockReturnValueOnce('');
    expect(sessionStorage({})).toStrictEqual({
      isStart: true,
      storage: true,
      id: expect.any(String),
      start: expect.any(Number),
      updated: expect.any(Number),
      isNew: true,
      device: expect.any(String),
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
      isStart: false,
      isNew: true,
      count: 1,
      runs: 1,
    };

    jest.advanceTimersByTime(1000);
    mockStorageRead.mockReturnValue(JSON.stringify(session));

    sessionStorage({});
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
        isNew: false, // Not longer first visit
        runs: 2, // Increased number of runs
      }),
    );
  });

  test('Session update options', () => {
    sessionStorage({});
    expect(mockStorageWrite).toHaveBeenCalledWith(
      'elbSessionId',
      expect.any(String),
      30,
      'local',
    );

    sessionStorage({
      sessionAge: 5,
      sessionKey: 'foo',
      sessionStorage: 'session',
    });
    expect(mockStorageWrite).toHaveBeenCalledWith(
      'foo',
      expect.any(String),
      5,
      'session',
    );
  });

  test('Session default data', () => {
    const session = sessionStorage({ data: { foo: 'bar', count: 9001 } });

    expect(session).toStrictEqual(
      expect.objectContaining({
        id: expect.any(String),
        count: 9001,
      }),
    );
  });

  test('Existing active session with new UTM entry', () => {
    const start = Date.now();
    const session = {
      isStart: false,
      storage: true,
      id: 'sessionId',
      start,
      referrer: 'org',
      updated: start,
      marketing: true,
      campaign: 'old',
      isNew: true,
      count: 1,
      runs: 5,
    };

    mockStorageRead.mockImplementation((config) => {
      return { ...config.data, mock: 'window' };
    });

    mockStorageRead
      .mockReturnValue(JSON.stringify(session))
      .mockReturnValueOnce(device);
    jest.advanceTimersByTime(1000);

    const newSession = sessionStorage({
      url: 'https://www.elbwalker.com/?utm_campaign=new',
    });

    expect(newSession.id).not.toBe(session.id); // Expect a new session id
    expect(newSession).toStrictEqual({
      storage: true,
      device,
      start: start + 1000,
      updated: start + 1000,
      isStart: true,
      marketing: true,
      referrer: '',
      campaign: 'new',
      id: expect.any(String),
      isNew: false,
      count: 2,
      runs: 1,
    });
  });
});
