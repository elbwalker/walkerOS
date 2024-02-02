import { getId, getMarketingParameters, tryCatch } from '../..';
import sessionStorage from '../../web/session/sessionStorage';

describe('SessionStorage', () => {
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
  });

  test('Regular new session', () => {
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
});
