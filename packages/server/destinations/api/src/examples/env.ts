import type { Env } from '../types';

/**
 * Example environment configurations for API destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring external dependencies.
 */

const noop = () => Promise.resolve({ ok: true });

export const init: Env | undefined = {
  sendServer: undefined,
};

export const standard: Env = {
  sendServer: Object.assign(noop, {
    // Add any specific properties if needed for sendServer
  }) as unknown as Env['sendServer'],
};
