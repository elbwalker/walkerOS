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
      firstVisit: true,
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
      firstVisit: true,
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
      firstVisit: false,
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
      firstVisit: true,
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
        firstVisit: false,
        count: 2,
        runs: 1,
      }),
    );

    // Id should be different to previous session
    expect(newSession.id).toHaveLength(12);
  });

  test('Storage Session Key', () => {
    sessionStorage({}, utils);
    expect(mockStorageRead).toHaveBeenCalledWith('elbSessionId', undefined);

    sessionStorage({ sessionKey: 'customKey' }, utils);
    expect(mockStorageRead).toHaveBeenCalledWith('customKey', undefined);
  });

  test('Storage error', () => {
    mockStorageRead.mockReturnValue('invalid');
    expect(sessionStorage({}, utils)).toStrictEqual({
      id: expect.any(String),
      start: expect.any(Number),
      updated: expect.any(Number),
      isNew: true,
      firstVisit: true,
      referrer: '',
      count: 1,
      runs: 1,
    });
  });
});
