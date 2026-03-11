import type { Logger } from '@walkeros/core';

export function createMockLogger(): Logger.Instance {
  const logger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn((msg: string | Error) => {
      throw msg instanceof Error ? msg : new Error(String(msg));
    }),
    json: jest.fn(),
    scope: jest.fn(() => logger),
  };
  return logger;
}
